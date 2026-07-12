import { NextRequest, NextResponse } from "next/server";

// Prompts & Configuration
const GUARDRAIL_PROMPT = `
You are an Enterprise Context Guardrail.
Evaluate the user intent and decide if it falls strictly within the company context (e.g., business reporting, engineering tasks, internal processes). 
If it is outside context (e.g., personal advice, illegal acts, buying groceries), respond with REJECT.
Otherwise, respond with PASS.
`;

const PII_SCRUB_REGEX = /\b(?:\d{3}-\d{2}-\d{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi;

const STAGE_SYSTEM_PROMPTS = {
  HIGH_LEVEL: "You are Stage 1. Ask one clarifying question to understand the high-level goal of the user's intent.",
  DETAILS: "You are Stage 2. Ask for specific details, metrics, or formats required for the intent.",
  DEEP_DIVE: "You are Stage 3. Discuss edge cases, dependencies, and recurring needs.",
};

const KG_EXTRACTION_PROMPT = `
Extract Knowledge Graph nodes from this intent.
Return a JSON array of nodes: [{ label: "name", type: "Topic" | "Context" }]
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, stage } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || "";

    // 1. PII Scrubbing
    const scrubbedMessage = lastMessage.replace(PII_SCRUB_REGEX, "[REDACTED_PII]");

    // 2. Enterprise Guardrail Check (Simulated)
    const isRejected = scrubbedMessage.toLowerCase().includes("grocery") || scrubbedMessage.toLowerCase().includes("personal");
    if (isRejected) {
      return NextResponse.json({ 
        blocked: true, 
        reason: "Intent falls outside enterprise context. Please stick to business tasks." 
      }, { status: 403 });
    }

    // 3. Vector Similarity Search (Stub for pgvector)
    // await prisma.$queryRaw`SELECT id, rawInput FROM "Intent" ORDER BY embedding <-> $1 LIMIT 1`

    // 4. SSE Stream Setup for LLM Response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Determine correct prompt based on stage
        const prompt = STAGE_SYSTEM_PROMPTS[stage as keyof typeof STAGE_SYSTEM_PROMPTS] || STAGE_SYSTEM_PROMPTS.HIGH_LEVEL;
        
        // Simulated streaming response from LLM
        const textToStream = `[Simulated ${stage} response] Based on your request, I need to know a bit more. Could you clarify?`;
        const words = textToStream.split(" ");
        
        for (const word of words) {
          await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate latency
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: word + " " })}\n\n`));
        }

        // 5. If it's the final stage, run KG Extraction (Simulated)
        if (stage === "DEEP_DIVE") {
           // Simulate calling KG_EXTRACTION_PROMPT
           // await prisma.topic.create(...)
        }
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Refinement error:", error);
    return NextResponse.json({ error: "Failed to process intent" }, { status: 500 });
  }
}
