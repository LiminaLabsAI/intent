import React from "react";
import RefinementChat from "@/components/refinement/RefinementChat";
import { MessageSquare, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export default async function RefinePage() {
  let pastIntents: { id: string; title: string }[] = [];

  // BUG-001: degrade to an empty state if auth/DB are unavailable instead of 500ing.
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const rawIntents = await prisma.intent.findMany({
        where: { requesterId: (session.user as any).id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      pastIntents = rawIntents.map((i) => ({
        id: i.id,
        title: i.expectedOutcome || i.rawInput || "Untitled Intent",
      }));
    }
  } catch (e) {
    console.error('[refine] session/DB unavailable — rendering empty state:', e);
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))] lg:h-screen bg-white -m-4 sm:-m-6 lg:-m-8">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <div className="flex-1 w-full p-6 flex flex-col h-full">
           <RefinementChat />
        </div>
      </div>
    </div>
  );
}
