import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawIntents = await prisma.intent.findMany({
      where: { requesterId: (session.user as any).id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    const pastIntents = rawIntents.map(i => ({
      id: i.id,
      title: i.expectedOutcome || i.rawInput || "Untitled Intent"
    }));

    return NextResponse.json(pastIntents);
  } catch (error) {
    console.error("Failed to fetch intent history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
