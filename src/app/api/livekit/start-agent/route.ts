import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const AGENT_URL = process.env.AGENT_URL || "http://127.0.0.1:3001";

/**
 * POST /api/livekit/start-agent
 * 通知 Agent 连接到指定房间
 * Body: { room: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const room = String(body?.room || "").trim() || "huangge-chat";

    const res = await fetch(`${AGENT_URL}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return NextResponse.json({ error: `Agent 启动失败: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("start-agent error", e);
    return NextResponse.json({ error: "Agent 服务未启动，请运行 livekit-agent" }, { status: 503 });
  }
}
