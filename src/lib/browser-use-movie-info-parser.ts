export type BrowserUseMovieInfoConfidence = "high" | "medium" | "low";

const ALLOWED_GENRES = new Set(["剧情", "悬疑", "科幻", "爱情", "动作", "恐怖", "喜剧", "犯罪", "动画", "纪录片"]);

export interface BrowserUseMovieInfo {
  genre: string;
  keywords: string;
  title?: string;
  year?: string;
  mediaType?: "movie" | "tv" | "unknown";
  confidence: BrowserUseMovieInfoConfidence;
  sources: string[];
}

export function parseBrowserUseMovieInfo(output: unknown): BrowserUseMovieInfo | undefined {
  const value = typeof output === "string" ? parseJsonObject(output) : output;
  if (!value || typeof value !== "object") return undefined;

  const data = value as Record<string, unknown>;
  const rawGenre = typeof data.genre === "string" ? data.genre.trim() : "";
  const genre = ALLOWED_GENRES.has(rawGenre) ? rawGenre : "";
  const keywords = typeof data.keywords === "string" ? sanitizeKeywords(data.keywords) : "";
  const confidence =
    data.confidence === "high" || data.confidence === "medium" || data.confidence === "low"
      ? data.confidence
      : "low";
  const mediaType = normalizeMediaType(data.mediaType);
  const sources = Array.isArray(data.sources)
    ? data.sources.filter((item): item is string => typeof item === "string").slice(0, 6)
    : [];

  if (!genre || !keywords || confidence === "low") return undefined;

  return {
    genre,
    keywords,
    title: typeof data.title === "string" ? data.title.trim() : undefined,
    year: typeof data.year === "string" ? data.year.trim() : undefined,
    mediaType,
    confidence,
    sources,
  };
}

function sanitizeKeywords(input: string) {
  return input
    .replace(/[#*`\n\r]/g, "")
    .replace(/[，,；;|/]/g, "、")
    .replace(/[。、]{2,}/g, "、")
    .replace(/^[、\s]+|[、\s]+$/g, "")
    .trim();
}

function parseJsonObject(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const parsed = parseJsonObject(fenced[1]);
    if (parsed) return parsed;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
}

function normalizeMediaType(input: unknown): "movie" | "tv" | "unknown" {
  if (input === "movie" || input === "tv" || input === "unknown") return input;
  if (typeof input !== "string") return "unknown";
  const text = input.trim().toLowerCase();
  if (/电视剧|剧集|连续剧|series|tv/.test(text)) return "tv";
  if (/电影|影片|movie|film/.test(text)) return "movie";
  return "unknown";
}
