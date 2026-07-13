import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const intentId = params.id;
    const body = await req.json();

    const { status, message } = body;

    if (!intentId) {
      return NextResponse.json({ error: "intentId is required" }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    // Verify the intent exists
    const intent = await prisma.intent.findUnique({
      where: { id: intentId }
    });

    if (!intent) {
      return NextResponse.json({ error: "Intent not found" }, { status: 404 });
    }

    // Add a comment to the intent so it shows up in the chat/history
    await prisma.comment.create({
      data: {
        content: `Execution Update [${status}]: ${message || 'No additional details provided.'}`,
        intentId: intent.id,
        userId: intent.requesterId
      }
    });

    // If the status implies completion, we can update the intent status
    if (status === "COMPLETED" || status === "EXECUTED") {
      await prisma.intent.update({
        where: { id: intent.id },
        data: { status: "EXECUTED" }
      });
    }

    return NextResponse.json({ success: true, message: "Status updated" });
  } catch (error: any) {
    console.error("Webhook Status Update Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update status" }, { status: 500 });
  }
}
