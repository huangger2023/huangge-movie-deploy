import { parseBrowserUseMovieInfo, type BrowserUseMovieInfo } from "./browser-use-movie-info-parser";

type BrowserUseSession = {
  id?: string;
  status?: "created" | "idle" | "running" | "stopped" | "timed_out" | "error";
  output?: unknown;
  isTaskSuccessful?: boolean | null;
  lastStepSummary?: string | null;
};

const BROWSER_USE_API_BASE = "https://api.browser-use.com/api/v3";

export async function searchMovieInfoWithBrowserUse(params: {
  title: string;
  mediaType?: "movie" | "tv";
  timeoutMs?: number;
}): Promise<BrowserUseMovieInfo | undefined> {
  const apiKey = process.env.BROWSER_USE_API_KEY?.trim();
  if (!apiKey) return undefined;

  const timeoutMs = params.timeoutMs ?? 45_000;
  const startedAt = Date.now();
  const task = buildMovieInfoTask(params.title, params.mediaType);
  const created = await browserUseFetch<BrowserUseSession>("/sessions", apiKey, {
    method: "POST",
    body: JSON.stringify({
      task,
      model: "gemini-3-flash",
      keepAlive: false,
      maxCostUsd: 0.08,
      enableRecording: false,
      skills: false,
      agentmail: false,
      outputSchema: movieInfoOutputSchema(),
    }),
  });

  if (!created.id) return undefined;
  let session = created;
  while (Date.now() - startedAt < timeoutMs) {
    if (session.status === "stopped") {
      if (session.isTaskSuccessful === false) return undefined;
      return parseBrowserUseMovieInfo(session.output);
    }
    if (session.status === "error" || session.status === "timed_out") return undefined;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    session = await browserUseFetch<BrowserUseSession>(`/sessions/${created.id}`, apiKey);
  }

  return undefined;
}

export async function startMovieInfoBrowserUseSession(params: {
  title: string;
  mediaType?: "movie" | "tv";
}): Promise<string | undefined> {
  const apiKey = process.env.BROWSER_USE_API_KEY?.trim();
  if (!apiKey) return undefined;

  const created = await browserUseFetch<BrowserUseSession>("/sessions", apiKey, {
    method: "POST",
    body: JSON.stringify({
      task: buildMovieInfoTask(params.title, params.mediaType),
      model: "gemini-3-flash",
      keepAlive: false,
      maxCostUsd: 0.08,
      enableRecording: false,
      skills: false,
      agentmail: false,
      outputSchema: movieInfoOutputSchema(),
    }),
  });

  return created.id;
}

export async function getMovieInfoBrowserUseSession(sessionId: string): Promise<BrowserUseMovieInfo | undefined> {
  const apiKey = process.env.BROWSER_USE_API_KEY?.trim();
  if (!apiKey) return undefined;
  const session = await browserUseFetch<BrowserUseSession>(`/sessions/${encodeURIComponent(sessionId)}`, apiKey);
  if (session.status !== "stopped" || session.isTaskSuccessful === false) return undefined;
  return parseBrowserUseMovieInfo(session.output);
}

export async function queryMovieInfoBrowserUseSession(sessionId: string): Promise<{
  status: "pending" | "done" | "error";
  result?: BrowserUseMovieInfo;
  detail?: string;
}> {
  const apiKey = process.env.BROWSER_USE_API_KEY?.trim();
  if (!apiKey) return { status: "error", detail: "missing_api_key" };

  const session = await browserUseFetch<BrowserUseSession>(`/sessions/${encodeURIComponent(sessionId)}`, apiKey);
  if (session.status === "error" || session.status === "timed_out" || session.isTaskSuccessful === false) {
    return { status: "error", detail: session.status ?? "failed" };
  }

  if (session.status !== "stopped") {
    return { status: "pending", detail: session.lastStepSummary ?? session.status ?? "running" };
  }

  const result = parseBrowserUseMovieInfo(session.output);
  return result ? { status: "done", result } : { status: "error", detail: "invalid_or_low_confidence_output" };
}

function buildMovieInfoTask(title: string, mediaType?: "movie" | "tv") {
  const expectedType = mediaType === "tv" ? "电视剧/剧集" : mediaType === "movie" ? "电影" : "影视作品";
  return [
    `全网搜索并直接读取页面，核验影视作品《${title}》的基础资料。`,
    `用户期望类型：${expectedType}。如果搜索结果显示不是该类型，请如实返回 mediaType。`,
    "优先读取可信页面：豆瓣、百度百科、维基百科、IMDb/TMDb、官方资料、权威影视媒体。",
    "必须至少打开并读取 1 个可信网页，不要只停留在搜索结果页。",
    "只能基于页面内容判断，不要根据片名字面含义猜测。",
    "mediaType 必须只输出 movie、tv 或 unknown，不要输出中文。",
    "从允许类型中选择最接近的一个：剧情、悬疑、科幻、爱情、动作、恐怖、喜剧、犯罪、动画、纪录片。",
    "keywords 输出 3-6 个中文关键词，用顿号分隔，必须来自剧情主题、人物关系、核心设定或题材。",
    "如果存在同名作品，选择与用户输入标题最精确匹配且类型最接近期望的作品。",
    "如果无法确认具体作品，返回 genre 为空、keywords 为空、confidence 为 low。",
    "只返回结构化结果，不要输出解释。",
  ].join("\n");
}

function movieInfoOutputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      year: { type: "string" },
      mediaType: { type: "string", enum: ["movie", "tv", "unknown"] },
      genre: {
        type: "string",
        enum: ["剧情", "悬疑", "科幻", "爱情", "动作", "恐怖", "喜剧", "犯罪", "动画", "纪录片", ""],
      },
      keywords: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      sources: { type: "array", items: { type: "string" } },
    },
    required: ["title", "mediaType", "genre", "keywords", "confidence", "sources"],
  };
}

async function browserUseFetch<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BROWSER_USE_API_BASE}${path}`, {
    ...init,
    headers: {
      "X-Browser-Use-API-Key": apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!resp.ok) {
    throw new Error(`Browser Use 请求失败 (${resp.status})`);
  }
  return (await resp.json()) as T;
}

export { parseBrowserUseMovieInfo };
