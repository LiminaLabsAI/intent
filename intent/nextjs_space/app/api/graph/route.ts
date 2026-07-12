import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const topics = await prisma.topic.findMany();
    const contexts = await prisma.contextNode.findMany();
    const topicLinks = await prisma.topicToIntent.findMany({ include: { topic: true } });
    const contextLinks = await prisma.contextToIntent.findMany({ include: { context: true } });
    
    // Construct nodes
    const nodes = [
      ...topics.map(t => ({ id: t.name, name: t.name, group: 1 })),
      ...contexts.map(c => ({ id: c.name, name: c.name, group: 2 })),
      // Create a unique node for each intent ID referenced
      ...Array.from(new Set([...topicLinks.map(l => l.intentId), ...contextLinks.map(l => l.intentId)])).map(id => ({ id, name: "Intent " + id.slice(-4), group: 3 }))
    ];
    
    // Construct links
    const links = [
      ...topicLinks.map(l => ({ source: l.topic.name, target: l.intentId })),
      ...contextLinks.map(l => ({ source: l.context.name, target: l.intentId }))
    ];
    
    return NextResponse.json({ nodes, links });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch graph data" }, { status: 500 });
  }
}
