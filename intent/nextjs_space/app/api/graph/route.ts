import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role || 'END_USER';
    const userId = (session.user as any).id;
    const isGlobal = role === 'ADMIN' || role === 'REVIEWER';

    let topicLinks;
    let contextLinks;

    if (isGlobal) {
      topicLinks = await prisma.topicToIntent.findMany({ include: { topic: true } });
      contextLinks = await prisma.contextToIntent.findMany({ include: { context: true } });
    } else {
      // Personalized local neighborhood for the user
      topicLinks = await prisma.topicToIntent.findMany({ 
        where: { intent: { requesterId: userId } },
        include: { topic: true } 
      });
      contextLinks = await prisma.contextToIntent.findMany({ 
        where: { intent: { requesterId: userId } },
        include: { context: true } 
      });
    }

    // Extract unique topics and contexts based on the links retrieved
    const topicsMap = new Map();
    topicLinks.forEach(l => topicsMap.set(l.topic.name, l.topic));
    
    const contextsMap = new Map();
    contextLinks.forEach(l => contextsMap.set(l.context.name, l.context));
    
    // Construct nodes
    const nodes = [
      ...Array.from(topicsMap.values()).map(t => ({ id: t.name, name: t.name, group: 1 })),
      ...Array.from(contextsMap.values()).map(c => ({ id: c.name, name: c.name, group: 2 })),
      // Create a unique node for each intent ID referenced
      ...Array.from(new Set([...topicLinks.map(l => l.intentId), ...contextLinks.map(l => l.intentId)])).map(id => ({ id, name: "Intent " + id.slice(-4), group: 3 }))
    ];
    
    // Construct links
    const links = [
      ...topicLinks.map(l => ({ source: l.topic.name, target: l.intentId })),
      ...contextLinks.map(l => ({ source: l.context.name, target: l.intentId }))
    ];
    
    return NextResponse.json({ nodes, links, isGlobal });
  } catch (error) {
    console.error("Graph API Error:", error);
    return NextResponse.json({ error: "Failed to fetch graph data" }, { status: 500 });
  }
}
