import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText, generateObject, embed } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STAGE_SYSTEM_PROMPTS, KG_EXTRACTION_PROMPT } from "@/lib/llm/prompts";

const PII_SCRUB_REGEX = /\b(?:\d{3}-\d{2}-\d{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi;

export async function POST(req: NextRequest) {
  try {
    const { messages, stage, intentId } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || "";

    // 1. PII Scrubbing
    const scrubbedMessage = lastMessage.replace(PII_SCRUB_REGEX, "[REDACTED_PII]");

    // 2. Enterprise Guardrail Check
    const isRejected = scrubbedMessage.toLowerCase().includes("grocery") || scrubbedMessage.toLowerCase().includes("personal");
    if (isRejected) {
      return NextResponse.json({ 
        blocked: true, 
        reason: "Intent falls outside enterprise context. Please stick to business tasks." 
      }, { status: 403 });
    }

    let systemPrompt = STAGE_SYSTEM_PROMPTS[stage as keyof typeof STAGE_SYSTEM_PROMPTS] || STAGE_SYSTEM_PROMPTS.HIGH_LEVEL;

    // Semantic RAG Search for historical context
    if (stage === "HIGH_LEVEL" || stage === "DETAILS") {
      try {
        const { embedding } = await embed({
          model: openai.embedding('text-embedding-3-small'),
          value: scrubbedMessage
        });
        
        const similar = await prisma.$queryRawUnsafe<any[]>(`
          SELECT "rawInput" FROM "Intent" 
          WHERE embedding IS NOT NULL
          ORDER BY embedding <-> $1::vector 
          LIMIT 3
        `, `[${embedding.join(',')}]`);
        
        if (similar && similar.length > 0) {
          const pastIntents = similar.map(s => `- ${s.rawInput}`).join('\n');
          systemPrompt += `\n\nFor context, here are similar historical intents requested by others in the organization:\n${pastIntents}\nYou can use this to proactively suggest related topics or contexts.`;
        }
      } catch (err) {
        console.error("RAG search error:", err);
      }
    }

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: messages.map((m: any) => ({
         role: m.role,
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }
          
          // Background extraction after stream completes
          if (stage === "DEEP_DIVE") {
            try {
              const extraction = await generateObject({
                 model: openai('gpt-4o-mini'),
                 system: KG_EXTRACTION_PROMPT,
                 messages: [{ role: 'user', content: fullText }],
                 schema: z.object({
                   nodes: z.array(z.object({
                     label: z.string(),
                     type: z.enum(["Topic", "Context"])
                   }))
                 })
              });

              let currentIntentId = intentId;
              if (!currentIntentId) {
                 const user = await prisma.user.findFirst();
                 if (user) {
                   const newIntent = await prisma.intent.create({
                      data: { rawInput: scrubbedMessage, requesterId: user.id }
                   });
                   currentIntentId = newIntent.id;
                 }
              }

              if (currentIntentId) {
                // Generate and save embedding
                try {
                  const { embedding } = await embed({
                     model: openai.embedding('text-embedding-3-small'),
                     value: fullText
                  });
                  await prisma.$executeRawUnsafe(`
                    UPDATE "Intent" SET embedding = $1::vector WHERE id = $2
                  `, `[${embedding.join(',')}]`, currentIntentId);
                } catch (err) {
                  console.error("Embedding generation failed", err);
                }

                for (const node of extraction.object.nodes) {
                   if (node.type === "Topic") {
                      const topic = await prisma.topic.upsert({
                         where: { name: node.label },
                         update: {},
                         create: { name: node.label }
                      });
                      await prisma.topicToIntent.create({
                         data: { topicId: topic.id, intentId: currentIntentId }
                      }).catch(() => {}); // ignore duplicates
                   } else {
                      const ctx = await prisma.contextNode.upsert({
                         where: { name: node.label },
                         update: {},
                         create: { name: node.label, type: "BUSINESS_PROCESS" }
                      });
                      await prisma.contextToIntent.create({
                         data: { contextId: ctx.id, intentId: currentIntentId }
                      }).catch(() => {}); // ignore duplicates
                   }
                }
              }
            } catch (err) {
               console.error("KG Extraction failed", err);
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
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
