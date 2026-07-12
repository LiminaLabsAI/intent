import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url, payload } = await req.json();
    
    console.log(`[WEBHOOK] Dispatching payload to ${url}...`, payload);
    
    // Simulate latency and network request
    await new Promise(r => setTimeout(r, 1000));
    
    return NextResponse.json({ success: true, message: `Dispatched to ${url}` });
  } catch (error) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
