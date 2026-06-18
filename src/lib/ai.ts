import "server-only";
import ZAI from "z-ai-web-dev-sdk";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export interface ScriptGenInput {
  movieTitle: string;
  genre: string;
  style: string; // 解说风格: 悬疑反转 / 情感共鸣 / 速看爽文 / 深度解读 / 搞笑吐槽
  duration: string; // 60秒 / 90秒 / 3分钟 / 5分钟
  hookType: string; // 黄金3秒: 悬念提问 / 反差冲击 / 情感代入 / 数据震撼 / 故事引入
  tone: string; // 语气: 犀利 / 温暖 / 幽默 / 神秘 / 激情
  keywords?: string;
  extraNotes?: string;
  plotContext?: string; // Agent 协作：真实剧情参考（来自联网搜索或上传文档）
}

/**
 * 生成完整电影解说文案 (核心功能)
 */
export async function generateNarrationScript(input: ScriptGenInput) {
  const zai = await getZAI();
  const systemPrompt = `你是一位拥有千万播放的抖音电影解说头部创作者，也是资深编剧。你擅长把任何电影浓缩成"黄金3秒开头 + 高密度反转 + 情感升华结尾"的爆款短视频文案。
你的文案有这些特点：
1. 开头3秒必须有强钩子（悬念/反差/数据/情感），让观众无法划走
2. 全程口语化、节奏快、信息密度高，每句话都推动剧情或情绪
3. 善用"没想到""万万没想到""就在这时"等转折词制造爽感
4. 结尾要么情感升华金句，要么留悬念引导互动
5. 精准控制在指定时长内（按每分钟约220字估算）

【最重要原则】如果提供了"真实剧情参考"，你必须严格基于该真实剧情创作，**绝对不得虚构、捏造、添加任何未在参考中出现的情节、人物、对话或结局**。解说可以浓缩、可以重组、可以强化情绪，但事实层面必须忠于真实剧情——这是为了让创作者能据此剪辑对应画面，瞎编会导致无法剪辑。`;

  const userPrompt = `请为电影《${input.movieTitle}》创作一条抖音电影解说短视频文案。

${input.plotContext && input.plotContext.trim().length > 0 ? `【真实剧情参考（Agent 协作提供，务必忠于事实，禁止虚构）】
"""
${input.plotContext.trim().slice(0, 4000)}
"""

⚠️ 以上是经联网搜索/文档读取获得的真实剧情，你的正文解说必须基于此真实剧情，不得添加任何未提及的情节、人物、反转或结局。可以浓缩、可以强化情绪、可以调整叙事顺序，但事实层面必须 100% 忠实。` : `（未提供真实剧情参考，请基于你对该电影的了解创作，但请在文案末尾用一行小字标注：⚠️ 本文案剧情未经真实剧情校验，剪辑前请核实）`}

【创作参数】
- 类型：${input.genre}
- 解说风格：${input.style}
- 视频时长：${input.duration}
- 黄金3秒钩子类型：${input.hookType}
- 解说语气：${input.tone}
${input.keywords ? `- 必须包含关键词：${input.keywords}` : ""}
${input.extraNotes ? `- 补充要求：${input.extraNotes}` : ""}

【输出格式】请严格按以下结构输出（使用 Markdown）：

## 🎬 黄金3秒开头
（一句极具冲击力的开场白，制造悬念或反差，让观众无法划走）

## 📖 正文解说
（按"起-承-转-合"节奏推进剧情，口语化、高密度、有反转，不要平铺直叙。可用分段，每段聚焦一个情绪节点）

## 💬 互动金句结尾
（一句情感升华或悬念互动金句，引导点赞评论关注）

## 🏷️ 推荐标签
（5-8个适合抖音分发的标签，用空格分隔，带#号）

## 📌 爆款标题建议
（给出3个不同角度的爆款标题，每个独立成行，标注角度：悬念型/反差型/情感型）`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * 爆款标题生成器
 */
export async function generateTitles(params: {
  movieTitle: string;
  genre: string;
  count?: number;
}) {
  const zai = await getZAI();
  const count = params.count ?? 8;
  const systemPrompt = `你是抖音爆款标题专家，深谙"悬念型、反差型、数字型、争议型、情感型、提问型"六大爆款标题公式。标题要短、有钩子、带情绪、让人忍不住点开。`;
  const userPrompt = `为电影《${params.movieTitle}》（${params.genre}）生成 ${count} 个抖音电影解说爆款标题。

要求：
1. 每个标题控制在30字以内
2. 涵盖不同类型（悬念/反差/数字/争议/情感/提问）
3. 在标题后用括号注明所属类型

请按编号列表输出，格式：1. 标题内容（类型）`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * 黄金开头生成器
 */
export async function generateHook(params: {
  movieTitle: string;
  genre: string;
  hookType: string;
  count?: number;
}) {
  const zai = await getZAI();
  const count = params.count ?? 5;
  const systemPrompt = `你是抖音电影解说"黄金3秒"开头大师。你深信前3秒决定一条视频的生死，擅长用一句话把观众死死钉在屏幕上。`;
  const userPrompt = `为电影《${params.movieTitle}》（${params.genre}）生成 ${count} 个"${params.hookType}"类型的黄金3秒开头。

开头类型说明：
- 悬念提问：用问题勾起好奇心
- 反差冲击：制造认知冲突
- 情感代入：直击观众情绪
- 数据震撼：用数字制造冲击
- 故事引入：用微型场景带入

要求：
1. 每个开头3秒内能说完（约15-25字）
2. 极具画面感和冲击力
3. 让人无法划走

请按编号列表输出，每个开头独立成行。`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * 文案润色工具
 */
export async function polishScript(params: {
  content: string;
  goal: string; // 爆款化 / 口语化 / 提速 / 情感强化 / 反转加强
}) {
  const zai = await getZAI();
  const systemPrompt = `你是抖音文案润色大师，能把平淡的解说文案改造成爆款。你深谙"转折词、情绪词、节奏感、画面感"四大爆款要素。`;
  const userPrompt = `请对以下电影解说文案进行"${params.goal}"润色：

【原文案】
${params.content}

【润色要求】
1. 保留核心剧情信息，但全面提升表现力
2. 增加转折词（没想到/万万没想到/就在这时）制造爽感
3. 增强画面感和情绪张力
4. 优化节奏，短句为主，长短结合
5. 保持口语化，适合口播

【输出格式】
直接输出润色后的文案，不要解释。`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Agent 协作：联网搜索电影真实剧情
 * 用 web_search 找到剧情简介来源，再用 web_reader 读取全文，拼成 plotContext
 */
export interface PlotSearchResult {
  movieTitle: string;
  snippets: string; // 搜索摘要拼接
  fullPlot: string; // 深度读取的全文（可能为空）
  combined: string; // snippets + fullPlot 去重拼接，供 LLM 用
  sources: { name: string; url: string; host: string; snippet: string }[];
  searchedAt: string;
}

export async function searchMoviePlot(
  movieTitle: string,
  genre?: string
): Promise<PlotSearchResult> {
  const zai = await getZAI();
  const query = `${movieTitle} 电影 剧情简介 详细 结局 解析`;
  const results = (await zai.functions.invoke("web_search", {
    query,
    num: 6,
  })) as Array<{
    url: string;
    name: string;
    snippet: string;
    host_name: string;
  }>;

  const sources = results.map((r) => ({
    name: r.name,
    url: r.url,
    host: r.host_name,
    snippet: r.snippet,
  }));

  const snippets = results
    .map((r, i) => `【来源${i + 1}：${r.name}（${r.host_name}）】\n${r.snippet}`)
    .join("\n\n");

  // 深度读取：优先选剧情类来源（百度百科/知乎/豆瓣等中文站），读取全文
  let fullPlot = "";
  const plotHosts = [
    "baike.baidu",
    "zhuanlan.zhihu",
    "douban",
    "movie.douban",
    "zhihu",
    "sohu",
    "163.com",
    "sina",
  ];
  const ranked = [...results].sort((a, b) => {
    const aScore = plotHosts.some((h) => a.host_name.includes(h)) ? 0 : 1;
    const bScore = plotHosts.some((h) => b.host_name.includes(h)) ? 0 : 1;
    return aScore - bScore;
  });
  const readCandidates = ranked.slice(0, 2);
  for (const r of readCandidates) {
    try {
      const read = (await zai.functions.invoke("page_reader", {
        url: r.url,
      })) as {
        code: number;
        data?: { html?: string; title?: string; content?: string };
      };
      const rawText = read?.data?.html || read?.data?.content || "";
      const text = rawText
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
      if (text && text.length > 300) {
        fullPlot += `【深度读取：${r.name}】\n${text.slice(0, 2500)}\n\n`;
      }
    } catch {
      // page_reader 失败则跳过，用 snippets 兜底
    }
  }

  const combined = [
    fullPlot ? `=== 深度读取全文 ===\n${fullPlot}` : "",
    `=== 搜索摘要 ===\n${snippets}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    movieTitle,
    snippets,
    fullPlot,
    combined,
    sources,
    searchedAt: new Date().toISOString(),
  };
}

export async function generateTTS(params: {
  text: string;
  voice?: string;
  speed?: number;
}) {
  const zai = await getZAI();
  const text = params.text.trim().slice(0, 1000);
  const response = await zai.audio.tts.create({
    input: text,
    voice: params.voice ?? "tongtong",
    speed: params.speed ?? 1.0,
    response_format: "wav",
    stream: false,
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(new Uint8Array(arrayBuffer));
}

export const TTS_VOICES = [
  { id: "tongtong", name: "彤彤", desc: "温暖亲切", emoji: "🌸" },
  { id: "chuichui", name: "吹吹", desc: "活泼可爱", emoji: "✨" },
  { id: "xiaochen", name: "小辰", desc: "沉稳专业", emoji: "🎙️" },
  { id: "jam", name: "Jam", desc: "英音绅士", emoji: "🎩" },
  { id: "kazi", name: "卡子", desc: "清晰标准", emoji: "📻" },
  { id: "douji", name: "豆叽", desc: "自然流畅", emoji: "🍃" },
  { id: "luodo", name: "罗多", desc: "富有感染力", emoji: "🔥" },
] as const;
