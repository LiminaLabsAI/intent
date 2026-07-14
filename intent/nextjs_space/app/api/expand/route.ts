import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getStore } from "@/lib/agent";
import { tokenize } from "@/lib/agent/measure.ts";
import { loadCatalog } from "@/lib/agent/cost-catalog.ts";

const hf = createOpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_TOKEN || '',
});

const getChatModel = () => hf(process.env.AGENT_MODEL || 'Qwen/Qwen2.5-7B-Instruct');

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { intentId, type } = await req.json();
    if (!intentId || !type) {
      return NextResponse.json({ error: "Missing intentId or type" }, { status: 400 });
    }

    const intent = await prisma.intent.findUnique({ where: { id: intentId } });
    if (!intent) {
      return NextResponse.json({ error: "Intent not found" }, { status: 404 });
    }

    const intentData = {
      rawInput: intent.rawInput,
      entities: intent.entities,
      actions: intent.actions,
      scope: intent.scope,
      businessObjective: intent.businessObjective,
      intentType: intent.intentType,
      standardizedIntent: intent.standardizedIntent,
    };

    let systemPrompt = "";
    if (type === "PRD") {
      systemPrompt = `You are an expert Technical Product Manager. Turn the following structured intent into a comprehensive Product Requirements Document (PRD).
Use markdown. Include sections like: Overview, Problem Statement, Target Audience, Functional Requirements, Non-Functional Requirements, User Stories, Out of Scope.
Intent Data:
${JSON.stringify(intentData, null, 2)}
`;
    } else if (type === "PLAN") {
      systemPrompt = `You are an expert Technical Architect. Turn the following structured intent into a comprehensive Implementation Plan.
Use markdown. Include sections like: Architecture Overview, System Components, Database Schema Changes, API Endpoints, Execution Steps, Rollout Strategy.
Intent Data:
${JSON.stringify(intentData, null, 2)}
`;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const result = await streamText({
      model: getChatModel(),
      system: systemPrompt,
      prompt: `Please generate the ${type} for this intent.`,
      onFinish: async ({ text, usage }) => {
        try {
          const updatedIntent = await prisma.intent.findUnique({ where: { id: intentId } });
          const currentArtifacts = (updatedIntent?.artifacts as any) || {};
          currentArtifacts[type] = text;
          await prisma.intent.update({
            where: { id: intentId },
            data: { artifacts: currentArtifacts },
          });
        } catch (err) {
          console.error("[EXPAND] Error saving artifact", err);
        }

        // ADR-0001 calibration: log estimated-vs-actual output tokens for the
        // DOCUMENT reference class. Accumulates a corpus now so Phase-18
        // calibration has real data. Best-effort — never breaks the response.
        try {
          const store = await getStore();
          const record = await store.load(intentId);
          const complexity = record?.complexity ?? "moderate";
          const refClass = `document:${complexity}`;
          const prior = (await loadCatalog()).priors.find((p) => p.refClass === refClass);
          const u = usage as { completionTokens?: number; outputTokens?: number } | undefined;
          const actualOut = u?.completionTokens ?? u?.outputTokens ?? tokenize(text, "approx");
          await prisma.costObservation.create({
            data: {
              intentId, refClass, personaId: null,
              estOutLow: prior?.outLow ?? 0, estOutHigh: prior?.outHigh ?? 0, actualOut,
            },
          });
        } catch (err) {
          console.error("[EXPAND] cost observation failed", err);
        }
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[EXPAND] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
