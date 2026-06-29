import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 测试 AI 模型连接是否可用。
 * POST /api/ai/test-connection
 * body: { baseUrl, model, apiKey }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const baseUrl = String(body.baseUrl || "").trim();
    const model = String(body.model || "").trim();
    const apiKey = String(body.apiKey || "").trim();

    if (!baseUrl || !model || !apiKey) {
      return NextResponse.json(
        { error: "baseUrl、model、apiKey 均为必填" },
        { status: 400 }
      );
    }

    const normalized = baseUrl.replace(/\/+$/, "").replace(/\/chat\/completions\/?$/i, "");
    const url = `${normalized}/chat/completions`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "say hello in one word" }],
        max_tokens: 10,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return NextResponse.json(
        { error: `模型返回错误 (${resp.status}): ${detail.slice(0, 200)}` },
        { status: resp.status }
      );
    }

    return NextResponse.json({ ok: true, message: "连接成功" });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return NextResponse.json({ error: "连接超时，请检查 baseUrl 是否正确" }, { status: 408 });
    }
    console.error("test-connection error", e);
    return NextResponse.json({ error: "测试连接失败，请检查配置" }, { status: 500 });
  }
}