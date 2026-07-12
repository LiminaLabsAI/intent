import React from "react";
import RefinementChat from "@/components/refinement/RefinementChat";
import { MessageSquare, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export default async function RefinePage() {
  const session = await getServerSession(authOptions);
  
  let pastIntents: { id: string; title: string }[] = [];

  if (session?.user?.id) {
    const rawIntents = await prisma.intent.findMany({
      where: { requesterId: (session.user as any).id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    pastIntents = rawIntents.map(i => ({
      id: i.id,
      title: i.expectedOutcome || i.rawInput || "Untitled Intent"
    }));
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))] bg-white -m-4 sm:-m-6 lg:-m-8">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <div className="flex-1 w-full p-6 flex flex-col h-full">
           <RefinementChat />
        </div>
      </div>
    </div>
  );
}
