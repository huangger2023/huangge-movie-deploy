import { NextRequest, NextResponse } from "next/server";
import { getZAI } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ChatMessageRow {
  role: string;
  content: string;
}

/**
 * 课程 AI 助教：基于课时内容回答学员疑问，并持久化对话历史
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { question, lessonId, lessonTitle, lessonContent, courseTitle } =
      await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: "请输入问题" }, { status: 400 });
    }
    if (!lessonContent?.trim()) {
      return NextResponse.json(
        { error: "课时内容为空，无法解答" },
        { status: 400 }
      );
    }

    // 加载历史对话（若有 lessonId 且已登录）
    let history: ChatMessageRow[] = [];
    if (user && lessonId) {
      const rows = await db.chatMessage.findMany({
        where: { userId: user.id, lessonId },
        orderBy: { createdAt: "asc" },
        take: 12,
        select: { role: true, content: true },
      });
      history = rows.map((r) => ({ role: r.role, content: r.content }));
    }

    const zai = await getZAI();
    const systemPrompt = `你是「影述学院」的课程 AI 助教，专门帮助学员理解电影解说创作课程内容。

当前学习上下文：
- 课程：《${courseTitle || "电影解说课程"}》
- 课时：${lessonTitle || "当前课时"}
- 课时内容：
"""
${lessonContent.slice(0, 3000)}
"""

你的职责：
1. 基于上述课时内容，解答学员的疑问
2. 如果学员问的内容课时里有，直接引用并展开讲解
3. 如果学员问的内容课时里没有但相关，可以适当补充，但要说明"这部分课时未涉及，供你参考"
4. 如果学员问的完全无关（非电影解说创作话题），礼貌引导回课程主题
5. 回答要口语化、有耐心、鼓励学员，像一个温和的导师
6. 回答控制在 300 字以内，重点突出，可用分点或短段落
7. 如果学员问实操问题，尽量给出可执行的具体步骤`;

    const messages: { role: string; content: string }[] = [
      { role: "assistant", content: systemPrompt },
    ];
    for (const m of history.slice(-6)) {
      messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: "user", content: question.trim() });

    const completion = await zai.chat.completions.create({
      messages: messages as { role: "user" | "assistant"; content: string }[],
      thinking: { type: "disabled" },
    });

    const answer = completion.choices[0]?.message?.content ?? "";

    // 持久化用户提问 + AI 回答
    if (user && lessonId) {
      await db.chatMessage.createMany({
        data: [
          { userId: user.id, lessonId, role: "user", content: question.trim() },
          { userId: user.id, lessonId, role: "assistant", content: answer },
        ],
      });
    }

    return NextResponse.json({ answer, history: [...history, { role: "user", content: question }, { role: "assistant", content: answer }] });
  } catch (e) {
    console.error("assistant error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "助教回答失败，请重试" },
      { status: 500 }
    );
  }
}

/** 获取某课时的对话历史 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");
    if (!lessonId) {
      return NextResponse.json({ error: "缺少 lessonId" }, { status: 400 });
    }
    const messages = await db.chatMessage.findMany({
      where: { userId: user.id, lessonId },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return NextResponse.json({ messages });
  } catch (e) {
    console.error("assistant history error", e);
    return NextResponse.json({ error: "获取历史失败" }, { status: 500 });
  }
}

/** 清除某课时的对话历史 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");
    if (!lessonId) {
      return NextResponse.json({ error: "缺少 lessonId" }, { status: 400 });
    }
    const result = await db.chatMessage.deleteMany({
      where: { userId: user.id, lessonId },
    });
    return NextResponse.json({ deleted: result.count });
  } catch (e) {
    console.error("assistant clear error", e);
    return NextResponse.json({ error: "清除历史失败" }, { status: 500 });
  }
}
