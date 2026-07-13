import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText, embed } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STAGE_SYSTEM_PROMPTS, KG_EXTRACTION_PROMPT } from "@/lib/llm/prompts";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

// Connect to HuggingFace Inference Router for Chat
const hf = createOpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_TOKEN || '',
});

// Connect to local Ollama for Embeddings and Local Chat
const ollama = createOpenAI({
  baseURL: 'http://127.0.0.1:11434/v1',
  apiKey: 'ollama', 
});

// Select model based on environment
const getChatModel = () => {
  if (process.env.NODE_ENV === 'development') {
    return ollama('qwen2.5:1.5b');
  }
  return hf('zai-org/GLM-5.2:novita');
};

const PII_SCRUB_REGEX = /\b(?:\d{3}-\d{2}-\d{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi;

function padEmbedding(emb: number[]) {
  if (emb.length >= 1536) return emb.slice(0, 1536);
  return [...emb, ...Array(1536 - emb.length).fill(0)];
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("[REFINE] Unauthorized attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;
    console.log("[REFINE] Request from userId:", userId);

    const { messages, stage, intentId } = await req.json();
    console.log("[REFINE] Payload:", { messagesLength: messages.length, stage, intentId });
    const lastMessage = messages[messages.length - 1]?.content || "";

    const scrubbedMessage = lastMessage.replace(PII_SCRUB_REGEX, "[REDACTED_PII]");

    const isRejected = scrubbedMessage.toLowerCase().includes("grocery") || scrubbedMessage.toLowerCase().includes("personal");
    if (isRejected) {
      return NextResponse.json({ 
        blocked: true, 
        reason: "Intent falls outside enterprise context. Please stick to business tasks." 
      }, { status: 403 });
    }

    let systemPrompt = STAGE_SYSTEM_PROMPTS.HIGH_LEVEL;

    try {
      const { embedding } = await embed({
        model: ollama.embedding('nomic-embed-text'),
        value: scrubbedMessage
      });
      
      const paddedEmb = padEmbedding(embedding);
      
      const similar = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, "rawInput" FROM "Intent" 
        WHERE embedding IS NOT NULL
        ORDER BY embedding <-> $1::vector 
        LIMIT 3
      `, `[${paddedEmb.join(',')}]`);
      
      if (similar && similar.length > 0) {
        let similarContext = "";
        for (const sim of similar) {
           const nodes = await prisma.intent.findUnique({
              where: { id: sim.id },
              include: {
                 topics: { include: { topic: true } },
                 contexts: { include: { context: true } }
              }
           });
           const nodeNames = [
              ...(nodes?.topics.map(t => t.topic.name) || []),
              ...(nodes?.contexts.map(c => c.context.name) || [])
           ].filter(Boolean).join(', ');
           
           similarContext += `- Intent: "${sim.rawInput}" | Extracted Context: ${nodeNames || "None"}\n`;
        }
        
        systemPrompt += `\n\nI found similar historical intents in the organization:\n${similarContext}\nYou MUST NOT automatically apply assumptions from these past intents. Instead, you MUST start your response by explicitly asking the user if they want to apply the context from the similar past intent. Format it like: "I noticed in a previous similar intent [Intent Name], the context was [Context]. Would you like me to apply that same context here, or are we doing something different?"`;
      }
    } catch (err) {
      console.error("RAG search error:", err);
    }

    // CREATE INTENT IMMEDIATELY IF NEW
    let currentIntentId = intentId;
    if (!currentIntentId) {
       const newIntent = await prisma.intent.create({
          data: { rawInput: scrubbedMessage, requesterId: userId }
       });
       currentIntentId = newIntent.id;
    }

    const result = await streamText({
      model: getChatModel(),
      system: systemPrompt,
      messages: messages.map((m: any) => ({
         role: m.role === "agent" ? "assistant" : m.role,
         content: m.content.replace(PII_SCRUB_REGEX, "[REDACTED_PII]")
      }))
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          let fullText = "";
          for await (const chunk of result.textStream) {
            fullText += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk, intentId: currentIntentId })}\n\n`));
          }
          
          if (currentIntentId) {
             try {
               const extractionResult = await generateText({
                  model: getChatModel(),
                  system: KG_EXTRACTION_PROMPT + "\n\nRespond ONLY with a valid JSON array of objects, e.g., [{ \"label\": \"Cloud Migration\", \"type\": \"Topic\" }]",
                  messages: [{ role: 'user', content: fullText }]
               });
               
               let extractedNodes = [];
               try {
                 const jsonMatch = extractionResult.text.match(/\[.*\]/s);
                 if (jsonMatch) {
                   extractedNodes = JSON.parse(jsonMatch[0]);
                 } else {
                   extractedNodes = JSON.parse(extractionResult.text);
                 }
               } catch (e) {
                 console.error("Failed to parse KG extraction JSON", e);
               }

               try {
                 const { embedding } = await embed({
                    model: ollama.embedding('nomic-embed-text'),
                    value: fullText
                 });
                 const paddedSaveEmb = padEmbedding(embedding);
                 await prisma.$executeRawUnsafe(`
                   UPDATE "Intent" SET embedding = $1::vector WHERE id = $2
                 `, `[${paddedSaveEmb.join(',')}]`, currentIntentId);
               } catch (err) {
                 console.error("Embedding generation failed", err);
               }

               for (const node of extractedNodes) {
                  if (node.type === "Topic") {
                     const topic = await prisma.topic.upsert({
                        where: { name: node.label },
                        update: {},
                        create: { name: node.label }
                     });
                     await prisma.topicToIntent.create({
                        data: { topicId: topic.id, intentId: currentIntentId }
                     }).catch(() => {});
                  } else {
                     const ctx = await prisma.contextNode.upsert({
                        where: { name: node.label },
                        update: {},
                        create: { name: node.label, type: "BUSINESS_PROCESS" }
                     });
                     await prisma.contextToIntent.create({
                        data: { contextId: ctx.id, intentId: currentIntentId }
                     }).catch(() => {});
                  }
               }
             } catch (err) {
                console.error("KG Extraction failed", err);
             }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
          if (currentIntentId) {
             try {
                // Save the chat history
                const updatedMessages = [
                  ...messages,
                  { role: "assistant", content: fullText }
                ];
                await prisma.intent.update({
                  where: { id: currentIntentId },
                  data: { processingLog: { messages: updatedMessages } }
                });
             } catch (err) {
                console.error("Failed to save chat history", err);
             }
          }
        } catch (e) {
          controller.error(e);
        }
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
