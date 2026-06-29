import "server-only";
import { db } from "@/lib/db";
import { searchMoviePlotWithAgent, type AgentPlotResult } from "@/lib/agent";
import { humanizeGeneratedCopy, type HumanizeCopyKind } from "@/lib/ai-humanizer";
import { buildOpeningRetentionChecklist, buildOpeningRetentionRules } from "@/lib/ai-opening-rules";

/** 自定义模型配置（从 AiModel 表读取） */
export interface AiModelConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** AI 调用上下文：用于区分用户模型与管理员全局模型 */
export interface AiUserContext {
  userId?: string;
  isAdmin?: boolean;
}

// 全局默认模型缓存（管理员配置），60s 失效
let activeModelCache: { cfg: AiModelConfig | null; expiresAt: number } = {
  cfg: null,
  expiresAt: 0,
};

// 用户自有模型缓存：userId → {cfg, expiresAt}，30s 失效
const userModelCache = new Map<
  string,
  { cfg: AiModelConfig | null; expiresAt: number }
>();

// 全局模型公开开关缓存，10s 失效
let globalPublicCache: { value: boolean; expiresAt: number } = {
  value: true,
  expiresAt: 0,
};

/**
 * 读取全局模型是否对普通用户公开。
 * 默认公开（true）；管理员关闭后仅管理员可用全局模型。
 */
export async function getGlobalModelPublic(): Promise<boolean> {
  const now = Date.now();
  if (now < globalPublicCache.expiresAt) return globalPublicCache.value;
  try {
    const row = await db.systemSetting.findUnique({
      where: { key: "ai_global_model_public" },
    });
    const value = row?.value !== "false"; // 默认公开
    globalPublicCache = { value, expiresAt: now + 10_000 };
    return value;
  } catch {
    globalPublicCache = { value: true, expiresAt: now + 10_000 };
    return true;
  }
}

/** 清除全局模型公开开关缓存 */
export function clearGlobalModelPublicCache() {
  globalPublicCache = { value: true, expiresAt: 0 };
}

/** 清除用户模型缓存（用户增删改模型后调用） */
export function clearUserModelCache(userId?: string) {
  if (userId) userModelCache.delete(userId);
  else userModelCache.clear();
}

/** 清除全局默认模型缓存 */
export function clearGlobalModelCache() {
  activeModelCache = { cfg: null, expiresAt: 0 };
}

/**
 * 读取当前可用的 AI 模型配置。
 *
 * 优先级：
 * 1. 用户自有模型（UserAiModel 表，isActive=true）
 * 2. 管理员全局默认模型（AiModel 表，isDefault=true + isActive=true）
 *    - 管理员始终可用全局模型
 *    - 普通用户仅在全局模型公开时可用
 *
 * 无可用配置返回 null。
 */
export async function getActiveAiModel(
  ctx?: AiUserContext
): Promise<AiModelConfig | null> {
  const userId = ctx?.userId;
  const isAdmin = ctx?.isAdmin ?? false;
  const now = Date.now();

  // 1. 优先使用用户自有模型
  if (userId) {
    const cached = userModelCache.get(userId);
    if (cached && now < cached.expiresAt && cached.cfg) {
      return cached.cfg;
    }
    try {
      const userRow = await db.userAiModel.findFirst({
        where: { userId, isActive: true },
        orderBy: { updatedAt: "desc" },
      });
      if (userRow) {
        const cfg = {
          baseUrl: userRow.baseUrl,
          apiKey: userRow.apiKey,
          model: userRow.model,
        };
        userModelCache.set(userId, { cfg, expiresAt: now + 30_000 });
        return cfg;
      }
      // 缓存「无用户模型」结果，15s 内不再重复查库
      userModelCache.set(userId, { cfg: null, expiresAt: now + 15_000 });
    } catch {
      // 查库失败，继续回退到全局模型
    }
  }

  // 2. 无用户模型 → 回退到管理员全局默认模型
  // 普通用户需检查全局模型是否公开
  if (!isAdmin) {
    const isPublic = await getGlobalModelPublic();
    if (!isPublic) return null;
  }

  // 3. 使用全局默认模型（带 60s 缓存）
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
  cfg: AiModelConfig,
  timeoutMs = 45_000
): Promise<string> {
  const base = cfg.baseUrl.replace(/\/+$/, "").replace(/\/chat\/completions\/?$/i, "");
  const url = `${base}/chat/completions`;
  let lastDetail = "";
  const callStart = Date.now();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("AI 模型响应超时，请稍后重试或切换更快的模型");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (resp.ok) {
      const data = await resp.json();
      return data?.choices?.[0]?.message?.content ?? "";
    }

    lastDetail = await resp.text().catch(() => "");
    if (resp.status < 500 || attempt === 1) {
      throw new Error(
        `自定义模型请求失败 (${resp.status}): ${lastDetail.slice(0, 200)}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new Error(`自定义模型请求失败: ${lastDetail.slice(0, 200)}`);
}

export type LearningStage = "爆款" | "精选";
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

const DEFAULT_CREATOR_IP = "荒哥";

function buildHighRetentionOpeningPrompt(
  movieTitle: string,
  creatorIp = DEFAULT_CREATOR_IP,
  targetChars = "300-400",
) {
  return [
    "### 🎬 高完播率电影解说开头生成提示词",
    "",
    `请帮我为电影《${movieTitle}》写一个用于短视频/中视频的高完播率解说开头。`,
    `博主IP名称是：${creatorIp}`,
    `整体字数控制在 ${targetChars} 字左右，语速适中，必须尽快锁住观众注意力。`,
    "直接执行写作任务，不要评价、解释、复述本提示词，不要自称 AI 或模型。",
    "",
    buildOpeningRetentionRules(movieTitle, targetChars),
    "",
    "请严格按照以下【留存五步法结构】进行撰写：",
    "",
    "1. 普适痛点钩子（前3秒留人）：",
    "先写一个不依赖电影名和人名也成立的情绪痛点、生活场景、反常识困境或人性问题。让陌生观众先觉得「这事跟我有关」或「这情况太反常」。",
    "",
    "2. 具体画面落地（把观众带进去）：",
    "用一个生活化、可视化的场景把痛点落地，不要先介绍主角身份。画面要像观众眼前能看到的一幕，而不是百科说明。",
    "",
    "3. 人性困境升级（制造非看不可的悬念）：",
    "把这个场景升级为一个人性选择、阶层困境、道德悖论或命运反差。用问题推动观众想知道答案，但不要提前抛片名和人名。",
    "",
    "4. 自然引出电影（让片名浮出水面）：",
    "等痛点、画面和困境都立住后，再顺势引出《电影名》和关键人物。引出方式要像答案揭晓，不要像报幕。",
    "",
    "5. 价值承诺（最后锁住完播）：",
    "带出博主IP，并给观众一个继续看下去的理由：这部电影会解释一个扎心的人性真相、社会困境或命运反转。承诺要具体，不要空泛煽情。",
    "",
    "语气要求：悬疑、沉稳、充满力量感，不要废话，句句直击痛点。",
    "",
    buildOpeningRetentionChecklist(movieTitle),
  ].join("\n");
}

function stageFromLegacyStyle(style: string): LearningStage {
  if (style.includes("深度") || style.includes("精选")) return "精选";
  if (style.includes("反转") || style.includes("爆")) return "爆款";
  return "爆款";
}

function estimateTargetCharsFromDuration(duration: string) {
  const raw = duration.trim();
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 3000;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 3000;

  // 字数格式（如 "8000字"）直接作为目标字数
  if (/字/.test(raw)) {
    return Math.round(value);
  }
  if (/秒|s\b|sec/i.test(raw)) {
    return Math.max(180, Math.round((value / 60) * 210));
  }
  if (/分钟|分|min/i.test(raw)) {
    return Math.max(180, Math.round(value * 210));
  }

  // UI presets often use bare values for seconds. Treat small numbers as seconds.
  if (value <= 180) {
    return Math.max(180, Math.round((value / 60) * 210));
  }
  return Math.round(value * 210);
}

function shouldCorrectLength(targetChars: number, actualChars: number) {
  return Math.abs(actualChars - targetChars) / targetChars > 0.15;
}

function buildPlotConstraint(plotContext?: string) {
  if (!plotContext?.trim()) {
    return [
      "当前没有提供联网或文档剧情依据。",
      "硬规则：不得编造任何具体人物、情节、结局、台词、反转、评分或真实事件。",
      "只能输出可填写的创作结构、提问清单、开头框架和待补剧情占位；必须明确提示用户先提供剧情依据或开启联网搜索。",
      "如果用户要求生成成稿，也只能生成不含具体剧情事实的模板稿，不得把常识包装成真实剧情。",
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

function buildCompactPlotConstraint(plotContext?: string, maxChars = 2200) {
  if (!plotContext?.trim()) return buildPlotConstraint(plotContext);

  return [
    "已提供真实剧情依据。开头阶段只需要提炼能支撑钩子的核心设定、人物处境和冲突，不要复述全文。",
    "硬规则：不得虚构人物、反转、结局、台词或关键事件；允许压缩、重排、提炼。",
    "",
    "【真实剧情依据节选】",
    plotContext.trim().slice(0, maxChars),
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
    input.step === "opening" ? buildHighRetentionOpeningPrompt(input.movieTitle) : "",
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

async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  ctx?: AiUserContext,
  timeoutMs?: number,
) {
  const cfg = await getActiveAiModel(ctx);
  if (!cfg) {
    throw new Error(
      "未配置可用的 AI 模型。请在「我的模型」中添加自己的模型，或联系管理员开放全局模型。"
    );
  }

  return chatCompletionRaw(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    cfg,
    timeoutMs,
  );
}

async function humanizeCopy(
  text: string,
  kind: HumanizeCopyKind,
  ctx?: AiUserContext,
) {
  const cfg = await getActiveAiModel(ctx);
  if (!cfg) {
    throw new Error(
      "未配置可用的 AI 模型。请在「我的模型」中添加自己的模型，或联系管理员开放全局模型。"
    );
  }
  // 正文/完整文案体积大，给更长超时；开头/标题等短文案用默认超时
  const timeoutMs =
    kind === "script" || kind === "workflow-final" ? 60_000 : undefined;
  try {
    return await humanizeGeneratedCopy(text, kind, cfg, (msgs, c) =>
      chatCompletionRaw(msgs, c, timeoutMs),
    );
  } catch (e) {
    console.warn("humanizeCopy failed, returning raw text:", e instanceof Error ? e.message : e);
    // 降 AI 味失败不阻塞主流程，返回原始文案
    return text.trim();
  }
}

async function humanizeOpeningsBatch(
  items: string[],
  ctx?: AiUserContext,
): Promise<string[]> {
  if (items.length === 0) return [];

  const cfg = await getActiveAiModel(ctx);
  if (!cfg) {
    throw new Error(
      "未配置可用的 AI 模型。请在「我的模型」中添加自己的模型，或联系管理员开放全局模型。"
    );
  }

  const source = items
    .map((item, idx) => `### OPENING_${idx + 1}\n${item.trim()}`)
    .join("\n\n");
  const messages = [
    {
      role: "system" as const,
      content: [
        "Rewrite Chinese film/short-video openings to sound human and spoken.",
        "Keep facts, names, plot order, section count, section markers, and meaning.",
        "Return only rewritten sections. Do not mention AI, tools, detection, or prompts.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        "Batch humanize these openings with the mandatory anti-AI-flavor skills.",
        "Rules: remove template narration, neat AI transitions, inflated emotion, generic praise, and over-polished phrasing. Use plain spoken Chinese, shorter clauses, concrete verbs, and natural rhythm. Do not add facts.",
        "Keep each marker exactly as ### OPENING_N.",
        "",
        source,
      ].join("\n"),
    },
  ];

  try {
    const raw = await chatCompletionRaw(messages, cfg, 18_000);
    const parsed = items.map((fallback, idx) => {
      const marker = `### OPENING_${idx + 1}`;
      const nextMarker = `### OPENING_${idx + 2}`;
      const start = raw.indexOf(marker);
      if (start < 0) return fallback;
      const contentStart = start + marker.length;
      const next = raw.indexOf(nextMarker, contentStart);
      const content = raw.slice(contentStart, next >= 0 ? next : undefined).trim();
      return content || fallback;
    });
    return parsed;
  } catch (error) {
    console.warn("opening humanize batch failed", error);
    return items;
  }
}

async function fetchText(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
      },
      signal: controller.signal,
    });
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function htmlToText(raw: string) {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractDuckDuckGoResults(html: string) {
  const results: Array<{ url: string; name: string; snippet: string; host_name: string }> = [];
  const itemRegex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(html)) && results.length < 6) {
    let url = match[1].replace(/&amp;/g, "&");
    try {
      const parsed = new URL(url);
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) url = decodeURIComponent(uddg);
    } catch {
      // keep original URL
    }
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      host = "";
    }
    results.push({
      url,
      name: htmlToText(match[2]).slice(0, 120),
      snippet: htmlToText(match[3]).slice(0, 300),
      host_name: host,
    });
  }
  return results;
}

function buildSearchFallbackPrompt(movieTitle: string, genre?: string) {
  return [
    "你要为电影剧情资料检索生成搜索摘要，不得编造电影剧情。",
    `电影名：${movieTitle}`,
    genre ? `类型：${genre}` : "",
    "请只输出适合人工检索的关键词和核验清单，不要写剧情成稿。",
  ]
    .filter(Boolean)
    .join("\n");
}

async function summarizeSearchFallback(
  movieTitle: string,
  genre?: string,
  ctx?: AiUserContext
) {
  const cfg = await getActiveAiModel(ctx);
  if (!cfg) return "";
  return chatCompletionRaw(
    [
      {
        role: "system",
        content: "你是电影资料检索助手，只能给搜索关键词和核验清单，不能编造剧情。",
      },
      { role: "user", content: buildSearchFallbackPrompt(movieTitle, genre) },
    ],
    cfg
  ).catch(() => "");
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
  ctx?: AiUserContext,
): Promise<ScriptWorkflowStepResult> {
  const systemPrompt = [
    "你是一位同时懂课程设计和抖音电影解说创作的高级导师。",
    "你不是泛泛而谈的文案工具，而是在帮学员按指定阶段的方法做出同质量内容。",
    "你每次只生成一个步骤：开头、剧情、或结尾升华。",
    "输出必须同时照顾两件事：一是内容本身能用，二是学员能看懂为什么这么写。",
    OFFICIAL_BASIS,
  ].join("\n");

  const raw = await chatCompletion(systemPrompt, buildStepPrompt(input), ctx);

  try {
    const parsed = extractJsonObject(raw) as {
      draft?: string;
      breakdown?: unknown;
      checklist?: unknown;
    };

    const draft = await humanizeCopy(parsed.draft?.trim() || raw.trim(), "workflow-step", ctx);
    return {
      draft,
      breakdown: normalizeStringList(parsed.breakdown, "方法拆解"),
      checklist: normalizeStringList(parsed.checklist, "自检点"),
    };
  } catch {
    const draft = await humanizeCopy(raw.trim(), "workflow-step", ctx);
    return {
      draft,
      breakdown: ["模型未按结构返回，当前已保留成品内容，建议人工再过一遍方法说明。"],
      checklist: ["检查是否忠于剧情依据。", "检查是否符合当前阶段的方法重点。", "检查是否便于口播。"],
    };
  }
}

export async function compileFinalScriptPackage(
  input: CompileFinalScriptInput,
  ctx?: AiUserContext,
): Promise<CompileFinalScriptResult> {
  const systemPrompt = [
    "你是一位抖音电影解说课程主讲人，要把已确认的三段内容整合成最终交付包。",
    "终稿必须既能直接使用，又能让学员读懂方法。",
    "不能把普通剧情复述包装成精选稿，也不能为了强情绪而改剧情事实。",
    OFFICIAL_BASIS,
  ].join("\n");

  const raw = await chatCompletion(systemPrompt, buildFinalPrompt(input), ctx);

  try {
    const parsed = extractJsonObject(raw) as {
      finalScript?: string;
      methodBreakdown?: unknown;
      titleSuggestions?: unknown;
      tags?: unknown;
    };

    const finalScript = await humanizeCopy(parsed.finalScript?.trim() || raw.trim(), "workflow-final", ctx);
    const titleSuggestions = await Promise.all(
      normalizeStringList(parsed.titleSuggestions, "标题建议").map((item) =>
        humanizeCopy(item, "title", ctx),
      ),
    );
    return {
      finalScript,
      methodBreakdown: normalizeStringList(parsed.methodBreakdown, "方法拆解"),
      titleSuggestions,
      tags: normalizeStringList(parsed.tags, "推荐标签").slice(0, 8),
    };
  } catch {
    const finalScript = await humanizeCopy(raw.trim(), "workflow-final", ctx);
    return {
      finalScript,
      methodBreakdown: ["模型未按结构返回，当前已保留终稿内容。"],
      titleSuggestions: ["请基于终稿人工补 3 个标题。"],
      tags: ["电影解说", "抖音电影解说", "荒哥说电影"],
    };
  }
}

export async function generateNarrationScript(input: ScriptGenInput, ctx?: AiUserContext) {
  const systemPrompt = [
    "你是一位抖音电影解说编剧，遵循「荒哥说电影」方法体系。",
    "你要输出一份电影解说文案，兼顾口播顺滑、剧情清晰和情绪承接。",
    "如果提供了真实剧情依据，必须严格忠于依据，不得虚构情节、人设或结局。",
    OFFICIAL_BASIS,
  ].join("\n");

  const stage = stageFromLegacyStyle(input.style);
  const stageConfig = STAGE_METHODS[stage];

  // 根据时长测算目标字数：电影解说每分钟约 200-220 字。
  const targetWords = estimateTargetCharsFromDuration(input.duration);

  const openingTarget = Math.max(80, Math.min(180, Math.round(targetWords * 0.35)));

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
    `【硬性要求】整篇成稿总字数必须严格控制在 ${Math.floor(targetWords * 0.85)} ~ ${Math.ceil(targetWords * 1.15)} 字之间（开头+正文+结尾合计）。这是最重要的输出规范！`,
    "",
    "【开头规则】",
    buildHighRetentionOpeningPrompt(input.movieTitle, DEFAULT_CREATOR_IP, `${openingTarget}`),
    "",
    "【阶段开头补充规则】",
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

  console.log(`[ai] narrationScript start, targetWords=${targetWords}`);
  let output = await chatCompletion(systemPrompt, userPrompt, ctx, 90_000);
  console.log(`[ai] narrationScript first call done, outputLen=${output.length}`);

  // ---- 字数纠偏：最多重试 2 次，阈值 15% ----
  for (let correctionRound = 0; correctionRound < 2; correctionRound += 1) {
    const actualChars = output.trim().length;
    if (!shouldCorrectLength(targetWords, actualChars)) break;
    const deviation = Math.abs(actualChars - targetWords) / targetWords;
    const direction =
      actualChars > targetWords
        ? "精简冗余表述，把字数缩减到目标范围。不要删除关键剧情信息。"
        : "补充细节、氛围描写和心理刻画，把字数扩充到目标范围。不得虚构情节。";

    const retryPrompt = [
      userPrompt,
      "",
      "--- 你刚生成的完整版本 ---",
      output,
      "",
      `【字数校正 第${correctionRound + 1}次】目标字数必须在 ${Math.floor(targetWords * 0.85)} ~ ${Math.ceil(targetWords * 1.15)} 字之间。`,
      `你当前输出约 ${actualChars} 字（偏差 ${(deviation * 100).toFixed(0)}%），${direction}`,
      `注意：这是强制要求，不是建议。必须把字数控制在范围内。`,
    ].join("\n");

    output = await chatCompletion(systemPrompt, retryPrompt, ctx, 90_000);
    console.log(`[ai] narrationScript correction ${correctionRound + 1} done, outputLen=${output.length}`);
  }

  return humanizeCopy(output.trim(), "script", ctx);
}

/**
 * 生成 5 个不同风格的开头选项，供用户选择后再续写正文。
 * 一次 AI 调用产出全部 5 个开头，按标记分割后返回数组。
 */
export async function generateMultiOpenings(
  input: ScriptGenInput,
  ctx?: AiUserContext,
): Promise<string[]> {
  const systemPrompt = [
    "你是一位抖音电影解说编剧，遵循「荒哥说电影」方法体系。",
    "你要输出 5 个不同风格的电影解说开头段落，内容必须短、狠、口播顺。",
    "如果提供了真实剧情依据，必须严格忠于依据，不得虚构情节、人设或结局。",
  ].join("\n");

  const stage = stageFromLegacyStyle(input.style);
  const stageConfig = STAGE_METHODS[stage];

  const userPrompt = [
    `电影：${input.movieTitle}`,
    `类型：${input.genre}`,
    `风格：${input.style}`,
    `钩子方向：${input.hookType}`,
    `语气：${input.tone}`,
    input.keywords?.trim() ? `关键词：${input.keywords.trim()}` : "",
    input.extraNotes?.trim() ? `补充说明：${input.extraNotes.trim()}` : "",
    "",
    `阶段：${stage}`,
    `阶段核心方法：${stageConfig.focus}`,
    "",
    buildOpeningRetentionRules(input.movieTitle, "180-260"),
    "",
    `请为《${input.movieTitle}》生成 5 个不同风格的电影解说开头段落，每个 180-260 字。`,
    "要求：",
    "1. 每个开头都要能自然衔接后续剧情展开",
    "2. 5 个开头的风格要有明显差异（如悬念提问、情感代入、反差冲击、悲剧渲染、数据震撼等）",
    "3. 基于真实剧情，不得虚构",
    "4. 每个开头都必须先用普适痛点、反常设定、日常画面或人性困境抓住陌生观众，再自然引出电影名和具体人物",
    "5. 如果任一开头第一句话直接出现片名、人名、主角身份、年份背景、评分奖项或电影名场面，必须重写该开头",
    "",
    buildOpeningRetentionChecklist(input.movieTitle),
    "",
    buildCompactPlotConstraint(input.plotContext),
    "",
    "输出格式（严格按此格式）：",
    "## 开头选项 1 | 风格名称",
    "[开头内容]",
    "",
    "## 开头选项 2 | 风格名称",
    "[开头内容]",
    "",
    "## 开头选项 3 | 风格名称",
    "[开头内容]",
    "",
    "## 开头选项 4 | 风格名称",
    "[开头内容]",
    "",
    "## 开头选项 5 | 风格名称",
    "[开头内容]",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await chatCompletion(systemPrompt, userPrompt, ctx, 70_000);

  // 按 "## 开头选项 N | " 分割为数组
  const items: string[] = [];
  const parts = raw.split(/##\s*开头选项\s*\d+\s*\|?\s*/).filter(Boolean);
  for (const p of parts) {
    const trimmed = p.trim();
    if (trimmed) items.push(trimmed);
  }
  // 如果分出来的数量不对，按换行硬切兜底
  if (items.length < 3) {
    const lines = raw.split("\n").filter((l) => l.trim().length > 10);
    return humanizeOpeningsBatch(lines.slice(0, 5), ctx);
  }
  return humanizeOpeningsBatch(items.slice(0, 5), ctx);
}

/**
 * 给定已选定的开头，续写正文 + 结尾升华 + 标题建议 + 推荐标签。
 * 含字数纠偏 (±15% auto-rewrite)。
 */
export async function generateBodyFromOpening(
  input: ScriptGenInput,
  approvedOpening: string,
  ctx?: AiUserContext,
): Promise<string> {
  const targetWords = estimateTargetCharsFromDuration(input.duration);

  const systemPrompt = [
    "你是一位抖音电影解说编剧，遵循「荒哥说电影」方法体系。",
    "开头已经确定，请基于此续写正文、结尾升华等剩余部分。",
    `【硬性要求】全文（不含已确定的开头）总字数必须严格控制在 ${Math.floor(targetWords * 0.85)} ~ ${Math.ceil(targetWords * 1.15)} 字之间。这是最重要的输出规范，超出范围视为不合格。`,
    "如果提供了真实剧情依据，必须严格忠于依据，不得虚构情节、人设或结局。",
    OFFICIAL_BASIS,
  ].join("\n");

  const stage = stageFromLegacyStyle(input.style);
  const stageConfig = STAGE_METHODS[stage];

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
    "【已确定的开头】",
    approvedOpening,
    "",
    "【剧情展开规则】",
    stageConfig.storyRule,
    "",
    "【结尾规则】",
    stageConfig.endingRule,
    "",
    buildPlotConstraint(input.plotContext),
    "",
    "请基于上面的开头内容续写，输出以下完整结构：",
    "## 正文",
    "## 结尾升华",
    "## 标题建议（输出 3-5 个，每个加一句角度标注）",
    "## 推荐标签（输出 3-6 个）",
  ]
    .filter(Boolean)
    .join("\n");

  console.log(`[ai] bodyFromOpening start, targetWords=${targetWords}, plotLen=${input.plotContext?.length ?? 0}`);
  let output = await chatCompletion(systemPrompt, userPrompt, ctx, 90_000);
  console.log(`[ai] bodyFromOpening first call done, outputLen=${output.length}`);

  // 字数纠偏：最多重试 2 次，阈值 15%
  for (let correctionRound = 0; correctionRound < 2; correctionRound += 1) {
    const actualChars = output.trim().length;
    if (!shouldCorrectLength(targetWords, actualChars)) break;
    const deviation = Math.abs(actualChars - targetWords) / targetWords;
    const direction =
      actualChars > targetWords
        ? "精简冗余表述，把字数缩减到目标范围。不要删除关键剧情信息。"
        : "补充细节、氛围描写和心理刻画，把字数扩充到目标范围。不得虚构情节。";
    const retryPrompt = [
      userPrompt,
      "",
      "--- 你刚生成的完整版本 ---",
      output,
      "",
      `【字数校正 第${correctionRound + 1}次】目标字数必须在 ${Math.floor(targetWords * 0.85)} ~ ${Math.ceil(targetWords * 1.15)} 字之间。`,
      `你当前输出约 ${actualChars} 字（偏差 ${(deviation * 100).toFixed(0)}%），${direction}`,
      `注意：这是强制要求，不是建议。必须把字数控制在范围内。`,
    ].join("\n");
    output = await chatCompletion(systemPrompt, retryPrompt, ctx, 90_000);
    console.log(`[ai] bodyFromOpening correction ${correctionRound + 1} done, outputLen=${output.length}`);
  }

  console.log(`[ai] bodyFromOpening humanizing...`);
  const humanized = humanizeCopy(output.trim(), "script", ctx);
  return humanized;
}

export async function generateTitles(
  params: {
    movieTitle: string;
    genre: string;
    count?: number;
    plotContext?: string;
    stage?: LearningStage;
  },
  ctx?: AiUserContext,
) {
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

  const output = await chatCompletion(systemPrompt, userPrompt, ctx);
  return humanizeCopy(output, "title", ctx);
}

export async function generateHook(
  params: {
    movieTitle: string;
    genre: string;
    hookType: string;
    count?: number;
    plotContext?: string;
    stage?: LearningStage;
  },
  ctx?: AiUserContext,
) {
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
    "以下每个开头版本都必须严格调用并遵循这个提示词：",
    buildHighRetentionOpeningPrompt(params.movieTitle),
    "",
    `阶段开头补充规则：${stageConfig.openingRule}`,
    buildPlotConstraint(params.plotContext),
    "",
    "请按编号输出，每条都是 300-400 字左右的完整开头，不要只写一句话。",
    "禁止输出提示词分析、客套话、模型自我介绍或写作建议，只输出可直接口播的成品开头。",
  ].join("\n");

  const output = await chatCompletion(systemPrompt, userPrompt, ctx);
  return humanizeCopy(output, "hook", ctx);
}

export async function polishScript(
  params: {
    content: string;
    goal: string;
    movieTitle?: string;
    stage?: LearningStage;
    step?: WorkflowStep | "final";
  },
  ctx?: AiUserContext,
) {
  const stage = params.stage ?? "爆款";
  const goal = params.goal.toLowerCase();
  if (goal.includes("降ai") || goal.includes("ai味") || goal.includes("去ai") || goal.includes("口语化")) {
    return humanizeCopy(params.content.trim(), "polish", ctx);
  }

  const isOpeningRelated =
    params.step === "opening" || params.goal.includes("开头") || params.goal.includes("钩子");
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
    isOpeningRelated
      ? `开头改写必须调用并遵循：\n${buildHighRetentionOpeningPrompt(params.movieTitle?.trim() || "当前电影")}`
      : "",
    "",
    "【原文】",
    params.content.trim(),
    "",
    "请直接输出润色后的内容，不要解释。",
  ].join("\n");

  const output = await chatCompletion(systemPrompt, userPrompt, ctx);
  return humanizeCopy(output, "polish", ctx);
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
  return searchMoviePlotWithAgent(movieTitle, genre) as Promise<PlotSearchResult>;
}

export async function searchMoviePlotStage1(
  movieTitle: string,
  genre?: string,
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
  const result = (await searchMoviePlotWithAgent(movieTitle, genre)) as AgentPlotResult;
  const rawResults = result.sources.map((item) => ({
    url: item.url,
    name: item.name,
    snippet: item.snippet,
    host_name: item.host,
  }));
  const sources = result.sources.map((item) => ({
    name: item.name,
    url: item.url,
    host: item.host,
    snippet: item.snippet,
  }));

  return { sources, snippets: result.snippets, rawResults };
}

export async function searchMoviePlotStage2(stage1: {
  rawResults: Array<{
    url: string;
    name: string;
    snippet: string;
    host_name: string;
}>;
}): Promise<{ fullPlot: string; readSource: { name: string; url: string } | null }> {
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
  if (!candidate?.url) {
    return { fullPlot: "", readSource: null };
  }

  try {
    const rawText = await fetchText(candidate.url, 18000);
    const text = htmlToText(rawText);

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
