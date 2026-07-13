import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { EVALUATION_PROMPT } from "@/lib/llm/prompts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const novita = createOpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const ollama = createOpenAI({
  baseURL: 'http://127.0.0.1:11434/v1',
  apiKey: 'ollama', 
});

const getChatModel = () => {
  if (process.env.NODE_ENV === 'development') {
    return ollama('qwen2.5:1.5b');
  }
  return novita("zai-org/GLM-5.2:novita");
};

export async function POST(req: NextRequest) {
  try {
    const { messages, intentId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const conversationTranscript = messages
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const result = await generateObject({
      model: getChatModel(),
      system: EVALUATION_PROMPT,
      prompt: `Evaluate the following conversation transcript:\n\n${conversationTranscript}`,
      schema: z.object({
        score: z.number().describe("The quality score of the intent from 0 to 100"),
        reasoning: z.string().describe("Explanation of why this score was given"),
        missingDetails: z.array(z.string()).describe("List of missing details if the score is below 80"),
        formattedExport: z.string().describe("The formatted markdown export if the score is 80 or above, otherwise empty string"),
        businessObjective: z.string().optional().describe("The extracted high-level business objective if score >= 80"),
        scope: z.string().optional().describe("The extracted scope of the intent if score >= 80"),
        entities: z.record(z.any()).optional().describe("A key-value mapping of extracted entities if score >= 80"),
      }),
    });

    if (intentId && result.object.score >= 80) {
      try {
        await prisma.intent.update({
          where: { id: intentId },
          data: {
            businessObjective: result.object.businessObjective,
            scope: result.object.scope,
            entities: result.object.entities ? JSON.parse(JSON.stringify(result.object.entities)) : undefined,
          }
        });
      } catch (dbErr) {
        console.error("Failed to update intent structured data:", dbErr);
      }
    }

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("Evaluation failed:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
