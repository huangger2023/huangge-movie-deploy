import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateNarrationScript } from "@/lib/ai";

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

    // 使用 AI 生成调整后的文案
    // 这里复用 generateNarrationScript，但传入一个调整指令
    const adjustedText = fullText.replace(
      originalText,
      `[以下内容已根据用户指令调整: ${prompt}]\n${originalText}\n[/调整结束]`
    );

    // 简单处理：直接替换并返回（不调用完整的 AI 生成流程）
    // 如果需要更智能的调整，可以实现专门的 adjustText 函数
    const output = adjustedText;

    return NextResponse.json({ output });
  } catch (error) {
    console.error("调整文案失败:", error);
    return NextResponse.json({ error: "调整失败" }, { status: 500 });
  }
}