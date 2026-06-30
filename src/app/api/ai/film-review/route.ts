import { NextRequest, NextResponse } from "next/server";
import { searchMoviePlot, chatCompletionRaw, getActiveAiModel } from "@/lib/ai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一位资深的抖音影视解说创作者,擅长写带有个人观点的"影评式解说"。我接下来只会收到一个电影或剧集的名字以及联网搜索到的真实剧情资料,请你自行回忆该片的核心剧情,并自主提炼一个有深度的主题或观点,然后据此创作一条解说文案。

要求:
1. 开头3秒必须有强钩子,用一句话制造悬念或抛出反差,让人想看下去;
2. 中间按"抛出疑问、讲述剧情、穿插分析评论"的节奏展开,不要单纯复述剧情,每讲一段都要带一句独到的理解或点评;
3. 结尾要有一句能引发共鸣或讨论的金句,并自然引导互动;
4. 原创表达,避免套话和模板腔,观点要有新意。

【字数确认机制,最重要】
每次用户发来片名时,你必须先检查用户有没有同时注明字数和时长。只要其中任何一项缺失,你就严禁直接生成文案,只能用一句话反问:"请问这条要写多少字、对应时长多少?"然后停下来,不要输出任何正文。只有当字数和时长都明确给出后,你才开始创作,并严格贴近该数值,上下浮动不超过10%。

【格式硬性规定】
全文禁止出现破折号(包括各种形式),也不要用它来代替停顿或转折。需要停顿、补充说明或转折时,请直接拆成两个短句,用句号、逗号或问号自然衔接,保证朗读连贯不割裂。输出纯文案即可,不要添加格式说明或元数据。

以上规则在本次对话中持续生效。`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const movieTitle = String(body.movieTitle || "").trim();
    let targetChars = body.targetChars ? Number(body.targetChars) : 0;
    let duration = String(body.duration || "").trim();

    if (!movieTitle) {
      return NextResponse.json({ error: "请输入电影或剧集名称" }, { status: 400 });
    }

    // 字数确认机制：必须同时提供字数和时长
    if (!targetChars || !duration) {
      return NextResponse.json({
        requireConfirm: true,
        message: "请问这条要写多少字、对应时长多少？",
      });
    }

    // 联网搜索真实剧情（强制在线）
    const plotResult = await searchMoviePlot(movieTitle);
    const plotContext = plotResult?.combined?.trim() || "";

    // 准备提示词
    const targetRange = `${Math.floor(targetChars * 0.9)}-${Math.ceil(targetChars * 1.1)}`;
    const userPrompt = [
      `电影/剧集名称：${movieTitle}`,
      `目标字数：约 ${targetChars} 字（±10%，即 ${targetRange} 字）`,
      `对应时长：${duration}`,
      "",
      plotContext ? `【真实剧情资料】\n${plotContext.slice(0, 4000)}` : "（无搜索到的剧情资料，请结合你的知识创作，但不要凭空编造具体情节）",
      "",
      "请严格按照上述规则创作影评式解说文案。",
    ].join("\n");

    const cfg = await getActiveAiModel();
    if (!cfg) {
      return NextResponse.json({ error: "未配置可用的 AI 模型" }, { status: 400 });
    }

    const output = await chatCompletionRaw(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      cfg,
      90_000,
    );

    if (!output.trim()) {
      return NextResponse.json({ error: "生成失败，模型返回为空" }, { status: 502 });
    }

    return NextResponse.json({
      script: output.trim(),
      wordCount: output.trim().length,
      targetChars,
      plotSourceCount: plotResult?.sources?.length || 0,
    });
  } catch (e) {
    console.error("film-review error", e);
    const msg = e instanceof Error ? e.message : "生成失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
