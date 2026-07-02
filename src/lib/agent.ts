export type AgentSource = {
  name: string;
  url: string;
  host: string;
  snippet: string;
};

export type AgentPlotResult = {
  movieTitle: string;
  snippets: string;
  fullPlot: string;
  combined: string;
  sources: AgentSource[];
  searchedAt: string;
  memoryContext?: string;
  savedMemoryId?: string | null;
  memoryStatus?: {
    ok: boolean;
    status?: number;
    reason?: string;
  };
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
};

type AgentSearchOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

export class PlotEvidenceError extends Error {
  status = 503;

  constructor(message = "Agent 未能搜到足够真实剧情证据，已停止生成。请换一个更准确的片名，或先上传/粘贴剧情文档。") {
    super(message);
    this.name = "PlotEvidenceError";
  }
}

export function hasSufficientPlotEvidence(plotContext?: string) {
  const text = plotContext?.trim() ?? "";
  if (text.length < 300) return false;

  const evidenceSignals = [
    "来源",
    "http",
    "剧情",
    "简介",
    "结局",
    "解析",
    "豆瓣",
    "百度百科",
    "wikipedia",
    "douban",
    "baike",
  ];
  return evidenceSignals.some((signal) => text.toLowerCase().includes(signal.toLowerCase()));
}

export async function ensureVerifiedPlotContext(params: {
  movieTitle: string;
  genre?: string;
  plotContext?: string;
  allowSearch?: boolean;
  searcher?: (movieTitle: string, genre?: string) => Promise<AgentPlotResult>;
}) {
  if (hasSufficientPlotEvidence(params.plotContext)) {
    return {
      plotContext: params.plotContext!.trim(),
      agentResult: null as AgentPlotResult | null,
    };
  }

  if (params.allowSearch === false) {
    throw new PlotEvidenceError("缺少真实剧情依据，已停止生成。请先开启 Agent 搜索，或上传/粘贴剧情文档。");
  }

  const searcher = params.searcher ?? searchMoviePlotWithAgent;
  const agentResult = await searcher(params.movieTitle, params.genre);
  if (!hasSufficientPlotEvidence(agentResult.combined)) {
    throw new PlotEvidenceError();
  }

  return {
    plotContext: agentResult.combined,
    agentResult,
  };
}

export async function searchMoviePlotWithAgent(
  movieTitle: string,
  genre?: string,
  options: AgentSearchOptions = {},
): Promise<AgentPlotResult> {
  const fetcher = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const memoryContext = await recallHindsightMemory(movieTitle, genre, fetcher);
  const tavily = await searchWithTavily(movieTitle, genre, fetcher);
  const tinyfishSources = tavily.sources.length
    ? []
    : await searchWithTinyfish(movieTitle, genre, fetcher);
  const sources = tavily.sources.length ? tavily.sources : tinyfishSources;

  const readableSources = sources.filter((source) => source.url).slice(0, 3);
  const fetchedTexts = await Promise.all(
    readableSources.map((source) => fetchWithTinyfish(source, fetcher)),
  );

  const fullPlot = [
    tavily.answer ? `【Tavily 综合回答】\n${tavily.answer}` : "",
    ...fetchedTexts.filter(Boolean),
    ...sources
      .map((source, index) => `【来源${index + 1}全文片段：${source.name}】\n${source.snippet}`)
      .filter((item) => item.length > 50),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8000);

  const snippets = sources
    .map(
      (source, index) =>
        `【来源${index + 1}：${source.name}｜${source.host}】\n${source.snippet}\n${source.url}`,
    )
    .join("\n\n");

  const combined = [
    memoryContext ? `=== Hindsight 记忆召回 ===\n${memoryContext}` : "",
    fullPlot ? `=== Agent 深读剧情 ===\n${fullPlot}` : "",
    snippets ? `=== Agent 搜索来源 ===\n${snippets}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const memorySave = hasSufficientPlotEvidence(combined)
    ? await retainHindsightMemory(movieTitle, combined, fetcher)
    : { id: null, status: { ok: false, reason: "insufficient_evidence" } };

  return {
    movieTitle,
    snippets,
    fullPlot,
    combined,
    sources,
    searchedAt: now().toISOString(),
    memoryContext,
    savedMemoryId: memorySave.id,
    memoryStatus: memorySave.status,
  };
}

async function searchWithTavily(movieTitle: string, genre: string | undefined, fetcher: typeof fetch) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { answer: "", sources: [] as AgentSource[] };

  const query = `${movieTitle} ${genre ?? ""} 电影 真实剧情 简介 结局 解析`;
  const resp = await fetcher("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      include_answer: true,
      include_raw_content: true,
      max_results: 6,
    }),
  });

  if (!resp.ok) return { answer: "", sources: [] as AgentSource[] };
  const data = await resp.json().catch(() => ({}));
  const sources = Array.isArray(data.results)
    ? data.results.map(normalizeTavilyResult).filter(Boolean)
    : [];

  return {
    answer: typeof data.answer === "string" ? data.answer.slice(0, 1600) : "",
    sources,
  };
}

function normalizeTavilyResult(result: TavilyResult): AgentSource | null {
  if (!result.url && !result.content && !result.raw_content) return null;
  const url = result.url ?? "";
  return {
    name: (result.title || "搜索结果").slice(0, 120),
    url,
    host: hostOf(url),
    snippet: String(result.raw_content || result.content || "").slice(0, 1600),
  };
}

async function searchWithTinyfish(movieTitle: string, genre: string | undefined, fetcher: typeof fetch) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://api.search.tinyfish.ai");
  url.searchParams.set("query", `${movieTitle} ${genre ?? ""} 电影 剧情 简介 结局`);
  url.searchParams.set("limit", "6");

  const resp = await fetcher(url, {
    headers: { "X-API-Key": apiKey },
  });
  if (!resp.ok) return [];
  const data = await resp.json().catch(() => ({}));
  const items = Array.isArray(data.results) ? data.results : Array.isArray(data.data) ? data.data : [];

  return items
    .map((item: Record<string, unknown>) => {
      const itemUrl = String(item.url ?? item.link ?? "");
      const snippet = String(item.snippet ?? item.content ?? item.description ?? "");
      if (!itemUrl && !snippet) return null;
      return {
        name: String(item.title ?? item.name ?? "搜索结果").slice(0, 120),
        url: itemUrl,
        host: hostOf(itemUrl),
        snippet: snippet.slice(0, 1000),
      } satisfies AgentSource;
    })
    .filter(Boolean) as AgentSource[];
}

async function fetchWithTinyfish(source: AgentSource, fetcher: typeof fetch) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey || !source.url) return "";

  const resp = await fetcher("https://api.fetch.tinyfish.ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ urls: [source.url], format: "markdown" }),
  });
  if (!resp.ok) return "";
  const data = await resp.json().catch(() => ({}));
  const first = Array.isArray(data.results) ? data.results[0] : data;
  const text = String(first?.markdown ?? first?.content ?? first?.text ?? first?.html ?? "");
  return text.trim() ? `【TinyFish 深读：${source.name}】\n${text.slice(0, 2500)}` : "";
}

async function recallHindsightMemory(movieTitle: string, genre: string | undefined, fetcher: typeof fetch) {
  const apiKey = process.env.HINDSIGHT_API_KEY;
  const bankId = getHindsightBankId(apiKey);
  if (!apiKey || !bankId) return "";

  const resp = await fetcher(
    `https://api.hindsight.vectorize.io/v1/default/banks/${encodeURIComponent(bankId)}/memories/recall`,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: `${movieTitle} ${genre ?? ""} 电影真实剧情`,
      limit: 5,
      tags: ["movie_plot"],
      tags_match: "any",
    }),
    },
  );
  if (!resp.ok) return "";
  const data = await resp.json().catch(() => ({}));
  const memories = Array.isArray(data.memories)
    ? data.memories
    : Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.items)
        ? data.items
      : [];

  return memories
    .map((item: Record<string, unknown>) => String(item.content ?? item.text ?? item.memory ?? item.fact ?? ""))
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 2500);
}

async function retainHindsightMemory(movieTitle: string, content: string, fetcher: typeof fetch) {
  const apiKey = process.env.HINDSIGHT_API_KEY;
  const bankId = getHindsightBankId(apiKey);
  if (!apiKey || !bankId) {
    return { id: null, status: { ok: false, reason: "missing_config" } };
  }

  const memoryContent = content
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 2500);
  try {
    const resp = await fetcher(
      `https://api.hindsight.vectorize.io/v1/default/banks/${encodeURIComponent(bankId)}/memories`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          items: [
            {
              content: `电影《${movieTitle}》真实剧情资料：\n${memoryContent}`,
              context: "movie plot agent search",
              document_id: `movie-plot-${movieTitle}`,
              update_mode: "replace",
              tags: ["movie_plot", `movie:${movieTitle}`],
            },
          ],
        }),
      },
    );
    const data = await resp.json().catch(() => ({}));
    const id =
      typeof data.operation_id === "string"
        ? data.operation_id
        : typeof data.id === "string"
          ? data.id
          : data.success === true && typeof data.bank_id === "string"
            ? data.bank_id
            : null;

    return {
      id,
      status: {
        ok: resp.ok && Boolean(id),
        status: resp.status,
        reason: resp.ok ? (id ? "saved" : "missing_id") : "http_error",
      },
    };
  } catch (error) {
    return {
      id: null,
      status: {
        ok: false,
        reason: error instanceof Error ? error.name : "unknown_error",
      },
    };
  }
}

function getHindsightBankId(apiKey?: string) {
  if (process.env.HINDSIGHT_BANK_ID?.trim()) return process.env.HINDSIGHT_BANK_ID.trim();
  const inferred = apiKey?.split("_").filter(Boolean).at(-1);
  return inferred || "";
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
