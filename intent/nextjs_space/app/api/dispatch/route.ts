import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { intentId } = await req.json();

    if (!intentId) {
      return NextResponse.json({ error: "intentId is required" }, { status: 400 });
    }

    // 1. Fetch the full intent details
    const intent = await prisma.intent.findUnique({
      where: { id: intentId },
      include: {
        topics: { include: { topic: true } },
        contexts: { include: { context: true } }
      }
    });

    if (!intent) {
      return NextResponse.json({ error: "Intent not found" }, { status: 404 });
    }

    // 2. Fetch the Webhook configuration
    const webhookSetting = await prisma.systemSetting.findUnique({
      where: { id: "webhook" }
    });

    if (!webhookSetting || !webhookSetting.endpoint) {
      return NextResponse.json(
        { error: "Webhook not configured. Please set the Webhook URL in Admin Settings." },
        { status: 400 }
      );
    }

    // 3. Format the Dispatch Payload
    const payload = {
      flowId: intent.id,
      objective: intent.rawInput,
      metadata: {
        topics: intent.topics.map(t => t.topic.name),
        contexts: intent.contexts.map(c => c.context.name),
      },
      callbackUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/intents/${intent.id}/status`
    };

    // 4. Send the POST request to the Execution Agent Webhook
    const response = await fetch(webhookSetting.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSetting.apiKey ? { "Authorization": `Bearer ${webhookSetting.apiKey}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Execution Agent responded with status ${response.status}`);
    }

    // 5. Update Intent status to DISPATCHED
    await prisma.intent.update({
      where: { id: intent.id },
      data: { status: "DISPATCHED" }
    });

    return NextResponse.json({ success: true, message: "Intent Dispatched" });
  } catch (error: any) {
    console.error("Dispatch Error:", error);
    return NextResponse.json({ error: error.message || "Failed to dispatch intent" }, { status: 500 });
  }
}
