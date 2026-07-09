import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionOrApiKey } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionOrApiKey(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const intent = await prisma.intent.findUnique({
      where: { id: params.id },
    });

    if (!intent) {
      return new Response(JSON.stringify({ error: 'Intent not found' }), { status: 404 });
    }

    if (user.role === 'END_USER' && intent.requesterId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const body = await request.json();
    const { answers, parentId } = body;

    // Build the refined raw input
    let refinedInput = intent.rawInput;
    if (answers && typeof answers === 'object') {
      refinedInput += '\n\n[Clarifications Added]';
      for (const [question, answer] of Object.entries(answers)) {
        if (answer && String(answer).trim()) {
          refinedInput += `\n- ${question}: ${answer}`;
        }
      }
    }

    // Update intent record
    await prisma.intent.update({
      where: { id: params.id },
      data: {
        rawInput: refinedInput,
        clarifyingAnswers: answers || {},
        parentIntentId: parentId || null,
        status: 'DRAFT',
        currentStage: 1, // Reset back to stage 1 to re-parse from scratch
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        intentId: params.id,
        userId: user.id,
        action: 'SUBMIT_CLARIFICATION',
        stage: 5,
        details: { answers, parentId },
      },
    });

    return new Response(JSON.stringify({ success: true, message: 'Clarification submitted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Clarification submit error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to submit clarification' }), { status: 500 });
  }
}
