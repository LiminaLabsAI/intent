import React from "react";
import RefinementChat from "@/components/refinement/RefinementChat";
import { MessageSquare, Plus, Settings, GitBranch } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export default async function RefinePage() {
  let pastIntents: { id: string; title: string; publishedVersionNo: number | null; draftCount: number }[] = [];

  // BUG-001: degrade to an empty state if auth/DB are unavailable instead of 500ing.
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const rawIntents = await prisma.intent.findMany({
        where: { requesterId: (session.user as any).id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { bundle: { include: { versions: { where: { state: 'PUBLISHED' }, select: { versionNo: true } }, _count: { select: { versions: { where: { state: 'DRAFT' } } } } } } },
      });
      pastIntents = rawIntents.map((i) => {
        const latestPub = i.bundle?.versions.find((v) => v.versionNo != null);
        const maxVer = i.bundle?.versions.reduce((m: number | null, v) => v.versionNo != null && (m == null || v.versionNo > m) ? v.versionNo : m, null as number | null) ?? null;
        return {
          id: i.id,
          title: i.expectedOutcome || i.rawInput || "Untitled Intent",
          publishedVersionNo: maxVer,
          draftCount: i.bundle?._count?.versions ?? 0,
        };
      });
    }
  } catch (e) {
    console.error('[refine] session/DB unavailable — rendering empty state:', e);
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))] lg:h-screen bg-white -m-4 sm:-m-6 lg:-m-8">
      {/* Sidebar — published badges + draft count */}
      {pastIntents.length > 0 && (
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-gray-100 bg-gray-50/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <Link href="/refine" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              <Plus className="w-4 h-4" /> New intent
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {pastIntents.map((i) => (
              <Link key={i.id} href={`/refine?id=${i.id}`}
                className="block rounded-lg px-3 py-2 hover:bg-white transition group">
                <div className="flex items-start gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-gray-300 shrink-0 group-hover:text-indigo-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 truncate group-hover:text-gray-900">{i.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {i.publishedVersionNo != null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 inline-flex items-center gap-1">
                          <GitBranch className="w-2.5 h-2.5" /> v{i.publishedVersionNo}
                        </span>
                      )}
                      {i.draftCount > 0 && (
                        <span className="text-[10px] text-gray-400">{i.draftCount} draft{i.draftCount === 1 ? '' : 's'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      )}
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <div className="flex-1 w-full p-6 flex flex-col h-full">
           <RefinementChat />
        </div>
      </div>
    </div>
  );
}
