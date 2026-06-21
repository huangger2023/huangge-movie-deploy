import "server-only";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

/** 自定义模型配置（从 AiModel 表读取，与 z-ai SDK 无关） */
export interface AiModelConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

// 模块级缓存：避免每次文案生成都查库，60s 失效
let activeModelCache: { cfg: AiModelConfig | null; expiresAt: number } = {
  cfg: null,
  expiresAt: 0,
};

/**
 * 读取当前默认且启用的自定义模型配置。无配置返回 null。
 * 带 60s 模块级缓存，避免高频文案生成时频繁查库。
 */
export async function getActiveAiModel(): Promise<AiModelConfig | null> {
  const now = Date.now();
  if (now < activeModelCache.expiresAt) {
    return activeModelCache.cfg;
  }
  try {
    const row = await db.aiModel.findFirst({
      where: { isDefault: true, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    const cfg = row
      ? { baseUrl: row.baseUrl, apiKey: row.apiKey, model: row.model }
      : null;
    activeModelCache = { cfg, expiresAt: now + 60_000 };
    return cfg;
  } catch {
    // 查库失败（如表尚未迁移）时回退到 SDK，不阻断现有功能
    activeModelCache = { cfg: null, expiresAt: now + 60_000 };
    return null;
  }
}

/**
 * 用自定义模型配置走 OpenAI 兼容接口（fetch 直连）。
 * 不传智谱特有的 thinking 字段，保证非智谱端点也能兼容。
 * 接收完整 messages 数组，供 chatCompletion 与 assistant 路由复用。
 */
export async function chatCompletionRaw(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  cfg: AiModelConfig
): Promise<string> {
  const url = `${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `自定义模型请求失败 (${resp.status}): ${detail.slice(0, 200)}`
    );
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export type LearningStage = "小白" | "爆款" | "精选";
export type WorkflowStep = "opening" | "story" | "ending";
export type SourceMode = "none" | "web" | "doc";

export interface ScriptGenInput {
  movieTitle: string;
  genre: string;
  style: string;
  duration: string;
  hookType: string;
  tone: string;
  keywords?: string;
  extraNotes?: string;
  plotContext?: string;
}

export interface ScriptWorkflowStepInput {
  movieTitle: string;
  genre: string;
  stage: LearningStage;
  step: WorkflowStep;
  sourceMode: SourceMode;
  plotContext?: string;
  userNotes?: string;
  approvedOpening?: string;
  approvedStory?: string;
}

export interface ScriptWorkflowStepResult {
  draft: string;
  breakdown: string[];
  checklist: string[];
}

export interface CompileFinalScriptInput {
  movieTitle: string;
  genre: string;
  stage: LearningStage;
  sourceMode: SourceMode;
  plotContext?: string;
  userNotes?: string;
  approvedOpening: string;
  approvedStory: string;
  approvedEnding: string;
}

export interface CompileFinalScriptResult {
  finalScript: string;
  methodBreakdown: string[];
  titleSuggestions: string[];
  tags: string[];
}

type StageMethodConfig = {
  focus: string;
  learnerGoal: string;
  notesGuide: string;
  openingRule: string;
  storyRule: string;
  endingRule: string;
  breakdownRule: string;
};

const STAGE_METHODS: Record<LearningStage, StageMethodConfig> = {
  小白: {
    focus:
      "围绕「目标-阻力-行动-结果」搭建骨架，先让学员学会不写流水账，再学会借助 AI 起步。",
    learnerGoal:
      "输出必须让新手一看就懂、能直接模仿，术语少、句式清楚。",
    notesGuide:
      "优先写明故事主线、人物目标、当前卡住点、你最担心哪里讲不顺。",
    openingRule:
      "开头用固定句式：『他想 [核心目标]，但问题是 [核心阻力/现状] 』。前半句直接回答核心目标，将观众瞬间带入主航道；后半句制造悬念和冲突，暗示实现目标的难度。",
    storyRule:
      "剧情段按叙事单元公式推进：目标/行动 → 结果 → (解释) → 情绪/新行动。每个单元以目标开始、以结果结束，中间填充阻力。用「观众立场判断法」决定是否需要插入解释——换位思考、把事说清楚为首要任务，禁止用「卖关子」等新手期不合适的技巧。",
    endingRule:
      "结尾用最通俗的一句把结果和感受收住，顺手点出这类文案为什么这样写。",
    breakdownRule:
      "方法拆解要解释每一段为什么这样安排，用老师讲课的口吻，不要像算法说明书。",
  },
  爆款: {
    focus:
      "围绕「看点前置、强冲突先行、非重点压缩、情绪持续承接」打造高点击高完播脚本。核心原则：选新不选旧、追星写法（新剧从最新剧情切入）、控制总字数约4000字（15分钟视频）、设定5-6个看点分段展开。",
    learnerGoal:
      "输出要让人明显感到节奏更狠、信息更密、看点更集中，但不能虚构和乱剪逻辑。",
    notesGuide:
      "优先写明最强看点、想前置的冲突、情绪拉力、观众为什么会继续看。",
    openingRule:
      "开头一句话抛出最值钱的冲突或反差，让观众在3-5秒内明白这条视频为什么值得看。必须在开场就上冲突，不做人物背景介绍。",
    storyRule:
      "采用「五碟定乾坤」结构：只安排5-6道主菜（看点），每道200-300字；其他非看点用一句概括+钩子衔接跳过。用反推法（问为什么）理清逻辑闭环。视频前半部分坚持人物单一、目标单一；新角色在干扰目标的节点用倒叙插入。使用「混编混排」——把最精彩看点放在前面，通过跳跃性叙事制造观众疑问（如『两年后他们成了仇敌』），用钩子『原来当初……』引出后续，让每一段都像开头。",
    endingRule:
      "结尾要么抬高冲突余味，要么给出一句强互动钩子，让观众愿意评论和转述。",
    breakdownRule:
      "方法拆解要明确指出哪里在前置看点、哪里在压缩非看点、哪里在做承接和反转。",
  },
  精选: {
    focus:
      "围绕「观点法、剧外增量、情绪心理、结尾升华」做出符合精选/独家气质的高完成度文本。必须超越单纯复述剧情，展现创作者判断、情绪组织和剧外信息增量。",
    learnerGoal:
      "输出不能只是复述剧情，必须能看到创作者判断、情绪组织和剧外信息增量。",
    notesGuide:
      "优先写明观点方向、剧外增量、人物心理切入、你希望结尾升华到什么高度。",
    openingRule:
      "开头要兼顾钩子和立场——既要抓人，也要让人感到这条内容不是普通复述。使用『电影卖点增量模块』标准结构：先介绍电影客观卖点/评价（豆瓣评分/口碑），再加一句观点判断。",
    storyRule:
      "剧情段在忠于剧情的前提下，加入观点、细节理解、剧外信息和心理刻画，形成真正的增量。采用「反转先行法」：动笔前先用『尽管……却……』句式一句话概括该段核心反转，然后以这句为纲领倒推前文——前半部分所有细节只服务于铺垫反转的一端，后半部分强化反差结果。看完素材先通览全片，找出两个反差极大的『高光时刻』（即使相隔很远），大胆剔除中间片段，让它们成为相邻的反转。遵循『先有情，再选景』原则——先定反转点，再倒回去筛选能强化反转的素材。",
    endingRule:
      "结尾必须完成升华，最好落到人物、人性、命运、社会关系或创作者判断上。",
    breakdownRule:
      "方法拆解要明确哪些句子是观点、哪些是剧外增量、哪些是心理刻画、哪些是在做升华。",
  },
};

const STEP_LABELS: Record<WorkflowStep, string> = {
  opening: "开头",
  story: "剧情",
  ending: "结尾升华",
};

const OFFICIAL_BASIS = [
  "以抖音创作者中心、规则中心、安全与信任中心可公开核对的信息为边界。",
  "对平台规则、审核边界、AIGC 标识、推荐机制的表述必须区分“官方公开口径”和“实战经验总结”。",
  "绝不把经验包装成平台内部算法结论。",
].join("\n");

function stageFromLegacyStyle(style: string): LearningStage {
  if (style.includes("深度") || style.includes("精选")) return "精选";
  if (style.includes("反转") || style.includes("爆")) return "爆款";
  return "小白";
}

function buildPlotConstraint(plotContext?: string) {
  if (!plotContext?.trim()) {
    return [
      "当前没有提供联网或文档剧情依据。",
      "你可以基于常识完成创作，但不得伪造特别具体的人物、情节、结局细节。",
      "如果你无法确定某个细节，就用更稳妥、更概括的表达。",
    ].join("\n");
  }

  return [
    "已提供真实剧情依据，必须严格遵守以下硬规则：",
    "1. 不得虚构人物、反转、结局、台词或关键事件。",
    "2. 允许压缩、重排、提炼，但不得改变事实关系。",
    "3. 所有冲突、观点、升华都必须建立在给定剧情依据之上。",
    "",
    "【真实剧情依据】",
    plotContext.trim().slice(0, 4000),
  ].join("\n");
}

function buildStepPrompt(input: ScriptWorkflowStepInput) {
  const stageConfig = STAGE_METHODS[input.stage];
  const stepRule =
    input.step === "opening"
      ? stageConfig.openingRule
      : input.step === "story"
        ? stageConfig.storyRule
        : stageConfig.endingRule;

  const approvedParts = [
    input.approvedOpening ? `【已确认开头】\n${input.approvedOpening.trim()}` : "",
    input.approvedStory ? `【已确认剧情】\n${input.approvedStory.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    `电影名：${input.movieTitle}`,
    `类型：${input.genre}`,
    `创作阶段：${input.stage}`,
    `当前步骤：${STEP_LABELS[input.step]}`,
    `剧情来源：${input.sourceMode}`,
    "",
    `阶段方法重点：${stageConfig.focus}`,
    `学员目标：${stageConfig.learnerGoal}`,
    `当前步骤要求：${stepRule}`,
    `方法拆解要求：${stageConfig.breakdownRule}`,
    "",
    "用户补充：",
    input.userNotes?.trim() ? input.userNotes.trim() : `未补充。${stageConfig.notesGuide}`,
    "",
    approvedParts || "【已确认内容】暂无",
    "",
    buildPlotConstraint(input.plotContext),
    "",
    "请只返回 JSON，不要加代码块，不要加多余解释。",
    `JSON 结构：
{
  "draft": "当前步骤的成品文案",
  "breakdown": ["方法拆解1", "方法拆解2", "方法拆解3"],
  "checklist": ["自检点1", "自检点2", "自检点3"]
}`,
  ].join("\n");
}

function buildFinalPrompt(input: CompileFinalScriptInput) {
  const stageConfig = STAGE_METHODS[input.stage];

  return [
    `电影名：${input.movieTitle}`,
    `类型：${input.genre}`,
    `创作阶段：${input.stage}`,
    `剧情来源：${input.sourceMode}`,
    "",
    `阶段方法重点：${stageConfig.focus}`,
    `学员目标：${stageConfig.learnerGoal}`,
    `方法拆解要求：${stageConfig.breakdownRule}`,
    "",
    input.userNotes?.trim() ? `用户补充：${input.userNotes.trim()}` : "用户补充：无",
    "",
    "【已确认开头】",
    input.approvedOpening.trim(),
    "",
    "【已确认剧情】",
    input.approvedStory.trim(),
    "",
    "【已确认结尾升华】",
    input.approvedEnding.trim(),
    "",
    buildPlotConstraint(input.plotContext),
    "",
    "请把以上三段整合成一份可直接交付学员的终稿包，只返回 JSON，不要加代码块。",
    `JSON 结构：
{
  "finalScript": "完整终稿，内部可用 Markdown 小标题分段",
  "methodBreakdown": ["方法拆解1", "方法拆解2", "方法拆解3", "方法拆解4"],
  "titleSuggestions": ["标题1", "标题2", "标题3"],
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}`,
  ].join("\n");
}

async function chatCompletion(systemPrompt: string, userPrompt: string) {
  // 优先使用管理员配置的自定义模型（OpenAI 兼容端点）
  const cfg = await getActiveAiModel();
  if (cfg) {
    return chatCompletionRaw(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      cfg
    );
  }

  // 无自定义模型配置时回退到智谱 SDK（沿用原行为，不中断现有功能）
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  });

  return completion.choices[0]?.message?.content ?? "";
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("模型未返回合法 JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizeStringList(input: unknown, fallbackPrefix: string) {
  if (!Array.isArray(input)) {
    return [`${fallbackPrefix}暂未结构化返回，请人工快速过一遍。`];
  }

  const list = input
    .map((item) => String(item).trim())
    .filter(Boolean);

  return list.length > 0 ? list : [`${fallbackPrefix}暂未结构化返回，请人工快速过一遍。`];
}

export async function generateScriptWorkflowStep(
  input: ScriptWorkflowStepInput,
): Promise<ScriptWorkflowStepResult> {
  const systemPrompt = [
    "你是一位同时懂课程设计和抖音电影解说创作的高级导师。",
    "你不是泛泛而谈的文案工具，而是在帮学员按指定阶段的方法做出同质量内容。",
    "你每次只生成一个步骤：开头、剧情、或结尾升华。",
    "输出必须同时照顾两件事：一是内容本身能用，二是学员能看懂为什么这么写。",
    OFFICIAL_BASIS,
  ].join("\n");

  const raw = await chatCompletion(systemPrompt, buildStepPrompt(input));

  try {
    const parsed = extractJsonObject(raw) as {
      draft?: string;
      breakdown?: unknown;
      checklist?: unknown;
    };

    return {
      draft: parsed.draft?.trim() || raw.trim(),
      breakdown: normalizeStringList(parsed.breakdown, "方法拆解"),
      checklist: normalizeStringList(parsed.checklist, "自检点"),
    };
  } catch {
    return {
      draft: raw.trim(),
      breakdown: ["模型未按结构返回，当前已保留成品内容，建议人工再过一遍方法说明。"],
      checklist: ["检查是否忠于剧情依据。", "检查是否符合当前阶段的方法重点。", "检查是否便于口播。"],
    };
  }
}

export async function compileFinalScriptPackage(
  input: CompileFinalScriptInput,
): Promise<CompileFinalScriptResult> {
  const systemPrompt = [
    "你是一位抖音电影解说课程主讲人，要把已确认的三段内容整合成最终交付包。",
    "终稿必须既能直接使用，又能让学员读懂方法。",
    "不能把普通剧情复述包装成精选稿，也不能为了强情绪而改剧情事实。",
    OFFICIAL_BASIS,
  ].join("\n");

  const raw = await chatCompletion(systemPrompt, buildFinalPrompt(input));

  try {
    const parsed = extractJsonObject(raw) as {
      finalScript?: string;
      methodBreakdown?: unknown;
      titleSuggestions?: unknown;
      tags?: unknown;
    };

    return {
      finalScript: parsed.finalScript?.trim() || raw.trim(),
      methodBreakdown: normalizeStringList(parsed.methodBreakdown, "方法拆解"),
      titleSuggestions: normalizeStringList(parsed.titleSuggestions, "标题建议"),
      tags: normalizeStringList(parsed.tags, "推荐标签").slice(0, 8),
    };
  } catch {
    return {
      finalScript: raw.trim(),
      methodBreakdown: ["模型未按结构返回，当前已保留终稿内容。"],
      titleSuggestions: ["请基于终稿人工补 3 个标题。"],
      tags: ["电影解说", "抖音电影解说", "荒哥说电影"],
    };
  }
}

export async function generateNarrationScript(input: ScriptGenInput) {
  const systemPrompt = [
    "你是一位抖音电影解说编剧，遵循「荒哥说电影」方法体系。",
    "你要输出一份电影解说文案，兼顾口播顺滑、剧情清晰和情绪承接。",
    "如果提供了真实剧情依据，必须严格忠于依据，不得虚构情节、人设或结局。",
    OFFICIAL_BASIS,
  ].join("\n");

  const stage = stageFromLegacyStyle(input.style);
  const stageConfig = STAGE_METHODS[stage];

  // 根据时长测算目标字数——电影解说每分钟约 200-220 字
  const durMatch = input.duration.match(/(\d+)/);
  const targetWords = durMatch ? parseInt(durMatch[1], 10) * 210 : 3000;

  const userPrompt = [
    `电影：${input.movieTitle}`,
    `类型：${input.genre}`,
    `风格：${input.style}`,
    `目标字数：约 ${targetWords} 字（±10%）`,
    `钩子方向：${input.hookType}`,
    `语气：${input.tone}`,
    input.keywords?.trim() ? `关键词：${input.keywords.trim()}` : "",
    input.extraNotes?.trim() ? `补充说明：${input.extraNotes.trim()}` : "",
    "",
    `阶段：${stage}`,
    `阶段核心方法：${stageConfig.focus}`,
    "",
    "【开头规则】",
    stageConfig.openingRule,
    "",
    "【剧情展开规则】",
    stageConfig.storyRule,
    "",
    "【结尾规则】",
    stageConfig.endingRule,
    "",
    buildPlotConstraint(input.plotContext),
    "",
    "请用 Markdown 输出以下结构：",
    "## 开头",
    "## 正文",
    "## 结尾升华",
    "## 标题建议（输出 3-5 个，每个加一句角度标注）",
    "## 推荐标签（输出 3-6 个）",
  ]
    .filter(Boolean)
    .join("\n");

  return chatCompletion(systemPrompt, userPrompt);
}

export async function generateTitles(params: {
  movieTitle: string;
  genre: string;
  count?: number;
  plotContext?: string;
  stage?: LearningStage;
}) {
  const count = params.count ?? 8;
  const stage = params.stage ?? "爆款";
  const stageConfig = STAGE_METHODS[stage];
  const systemPrompt = [
    "你是一位抖音电影解说标题编辑。",
    "标题必须短、准、抓人，但不能失真。",
    "如果提供了真实剧情依据，标题只能建立在真实剧情之上。",
    OFFICIAL_BASIS,
  ].join("\n");

  const userPrompt = [
    `电影：${params.movieTitle}`,
    `类型：${params.genre}`,
    `标题数量：${count}`,
    `阶段：${stage}`,
    `阶段重点：${stageConfig.focus}`,
    buildPlotConstraint(params.plotContext),
    "",
    "请按编号输出标题，每行一个，并在行尾括号标注角度。",
  ].join("\n");

  return chatCompletion(systemPrompt, userPrompt);
}

export async function generateHook(params: {
  movieTitle: string;
  genre: string;
  hookType: string;
  count?: number;
  plotContext?: string;
  stage?: LearningStage;
}) {
  const count = params.count ?? 5;
  const stage = params.stage ?? "爆款";
  const stageConfig = STAGE_METHODS[stage];
  const systemPrompt = [
    "你是一位专做抖音电影解说开头的编剧。",
    "你擅长在 1 句话里抛出冲突、反差或立场，让观众停下来。",
    "如果提供了真实剧情依据，开头必须忠于剧情，不得虚构。",
    OFFICIAL_BASIS,
  ].join("\n");

  const userPrompt = [
    `电影：${params.movieTitle}`,
    `类型：${params.genre}`,
    `阶段：${stage}`,
    `开头数量：${count}`,
    `钩子方向：${params.hookType}`,
    `阶段开头规则：${stageConfig.openingRule}`,
    buildPlotConstraint(params.plotContext),
    "",
    "请按编号输出，每条尽量控制在一口气能说完的长度。",
  ].join("\n");

  return chatCompletion(systemPrompt, userPrompt);
}

export async function polishScript(params: {
  content: string;
  goal: string;
  stage?: LearningStage;
  step?: WorkflowStep | "final";
}) {
  const stage = params.stage ?? "爆款";
  const stepLabel =
    params.step === "opening"
      ? "开头"
      : params.step === "story"
        ? "剧情"
        : params.step === "ending"
          ? "结尾升华"
          : "终稿";

  const systemPrompt = [
    "你是一位抖音电影解说改稿编辑。",
    "你的任务是提升表达质量，而不是凭空改事实。",
    "任何情况下都不能新增未经确认的剧情细节。",
    OFFICIAL_BASIS,
  ].join("\n");

  const userPrompt = [
    `阶段：${stage}`,
    `当前部位：${stepLabel}`,
    `润色目标：${params.goal}`,
    `阶段重点：${STAGE_METHODS[stage].focus}`,
    "",
    "【原文】",
    params.content.trim(),
    "",
    "请直接输出润色后的内容，不要解释。",
  ].join("\n");

  return chatCompletion(systemPrompt, userPrompt);
}

export interface PlotSearchResult {
  movieTitle: string;
  snippets: string;
  fullPlot: string;
  combined: string;
  sources: { name: string; url: string; host: string; snippet: string }[];
  searchedAt: string;
}

export async function searchMoviePlot(
  movieTitle: string,
  genre?: string,
): Promise<PlotSearchResult> {
  const stage1 = await searchMoviePlotStage1(movieTitle, genre);
  const stage2 = await searchMoviePlotStage2(stage1);

  const combined = [
    stage2.fullPlot ? `=== 深读全文 ===\n${stage2.fullPlot}` : "",
    `=== 搜索摘要 ===\n${stage1.snippets}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    movieTitle,
    snippets: stage1.snippets,
    fullPlot: stage2.fullPlot,
    combined,
    sources: stage1.sources,
    searchedAt: new Date().toISOString(),
  };
}

export async function searchMoviePlotStage1(
  movieTitle: string,
  _genre?: string,
): Promise<{
  sources: Array<{ name: string; url: string; host: string; snippet: string }>;
  snippets: string;
  rawResults: Array<{
    url: string;
    name: string;
    snippet: string;
    host_name: string;
  }>;
}> {
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

  const sources = results.map((item) => ({
    name: item.name,
    url: item.url,
    host: item.host_name,
    snippet: item.snippet,
  }));

  const snippets = results
    .map(
      (item, index) =>
        `【来源${index + 1}：${item.name}｜${item.host_name}】\n${item.snippet}`,
    )
    .join("\n\n");

  return { sources, snippets, rawResults: results };
}

export async function searchMoviePlotStage2(stage1: {
  rawResults: Array<{
    url: string;
    name: string;
    snippet: string;
    host_name: string;
  }>;
}): Promise<{ fullPlot: string; readSource: { name: string; url: string } | null }> {
  const zai = await getZAI();
  const hostPriority = [
    "baike.baidu",
    "zhuanlan.zhihu",
    "movie.douban",
    "douban",
    "zhihu",
  ];

  const ranked = [...stage1.rawResults].sort((left, right) => {
    const leftIndex = hostPriority.findIndex((item) => left.host_name.includes(item));
    const rightIndex = hostPriority.findIndex((item) => right.host_name.includes(item));
    const leftScore = leftIndex >= 0 ? leftIndex : 99;
    const rightScore = rightIndex >= 0 ? rightIndex : 99;
    return leftScore - rightScore;
  });

  const candidate = ranked[0];
  if (!candidate) {
    return { fullPlot: "", readSource: null };
  }

  try {
    const readPromise = zai.functions.invoke("page_reader", { url: candidate.url });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("page_reader timeout")), 18000),
    );

    const read = (await Promise.race([readPromise, timeoutPromise])) as {
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

    if (text.length > 300) {
      return {
        fullPlot: `【深度读取：${candidate.name}】\n${text.slice(0, 2500)}\n`,
        readSource: { name: candidate.name, url: candidate.url },
      };
    }
  } catch {
    return { fullPlot: "", readSource: null };
  }

  return { fullPlot: "", readSource: null };
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
  { id: "tongtong", name: "彤彤", desc: "温暖亲切", emoji: "🌭" },
  { id: "chuichui", name: "吹吹", desc: "活泼可爱", emoji: "✨" },
  { id: "xiaochen", name: "小辰", desc: "沉稳专业", emoji: "🎣" },
  { id: "jam", name: "Jam", desc: "英音绅士", emoji: "🎺" },
  { id: "kazi", name: "卡子", desc: "清晰标准", emoji: "📶" },
  { id: "douji", name: "豆迹", desc: "自然流畅", emoji: "🌀" },
  { id: "luodo", name: "罗多", desc: "富有感染力", emoji: "🔟" },
] as const;
