import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { adjustTextWithAI } from "@/lib/ai-adjust";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { originalText, prompt, fullText } = body;

    if (!originalText || !prompt || !fullText) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const ctx = user ? { userId: user.id, isAdmin: user.role === "ADMIN" } : undefined;

    const output = await adjustTextWithAI(
      { originalText, prompt, fullText },
      ctx,
    );

    return NextResponse.json({ output });
  } catch (error) {
    console.error("调整文案失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "调整失败" },
      { status: 500 },
    );
  }
}
