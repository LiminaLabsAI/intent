import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { EVALUATION_PROMPT } from "@/lib/llm/prompts";

export const dynamic = "force-dynamic";

const novita = createOpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const conversationTranscript = messages
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const result = await generateObject({
      model: novita("zai-org/GLM-5.2:novita"),
      system: EVALUATION_PROMPT,
      prompt: `Evaluate the following conversation transcript:\n\n${conversationTranscript}`,
      schema: z.object({
        score: z.number().describe("The quality score of the intent from 0 to 100"),
        reasoning: z.string().describe("Explanation of why this score was given"),
        missingDetails: z.array(z.string()).describe("List of missing details if the score is below 80"),
        formattedExport: z.string().describe("The formatted markdown export if the score is 80 or above, otherwise empty string"),
      }),
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("Evaluation failed:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
