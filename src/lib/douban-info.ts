export interface DoubanSuggestion {
  id?: string;
  title?: string;
  year?: string;
  img?: string;
  sub_title?: string;
  types?: string[];
  type?: string;
  url?: string;
}

export type MovieInfoSource = "douban" | "known" | "ai" | "browser-use" | "none";
export type MovieInfoConfidence = "high" | "medium" | "low";

export interface KnownMovieInfo {
  title: string;
  year: string;
  genre: string;
  keywords: string;
}

export interface ParsedAiMovieInfo {
  genre: string;
  keywords: string;
  confidence: MovieInfoConfidence;
}

const ALLOWED_GENRES = new Set(["剧情", "悬疑", "科幻", "爱情", "动作", "恐怖", "喜剧", "犯罪", "动画", "纪录片"]);

const KNOWN_MOVIES: Record<string, KnownMovieInfo> = {
  [normalizeTitle("寄生虫")]: {
    title: "寄生虫",
    year: "2019",
    genre: "剧情",
    keywords: "贫富差距、阶级寓言、半地下室、家庭骗局、黑色幽默、奉俊昊",
  },
};

export function normalizeTitle(input: string) {
  return input
    .toLowerCase()
    .replace(/[《》“”"'\s:：,，.。!！?？\-_/\\()[\]（）【】]/g, "")
    .trim();
}

export function sanitizeKeywords(input: string) {
  return input
    .replace(/[#*`\n\r]/g, "")
    .replace(/[，,；;|/]/g, "、")
    .replace(/[。、]{2,}/g, "、")
    .replace(/^[、。\s]+|[、。\s]+$/g, "")
    .trim();
}

export function pickBestSuggestion(
  suggestions: DoubanSuggestion[],
  query: string,
  expectedMediaType?: "movie" | "tv",
) {
  const queryNorm = normalizeTitle(query);
  if (!queryNorm) return undefined;

  const scored = suggestions
    .map((item, index) => ({ item, index, score: scoreSuggestion(item, queryNorm, expectedMediaType) }))
    .filter(({ score }) => score >= 70)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored[0]?.item;
}

export function getSuggestionConfidence(suggestion: DoubanSuggestion, query: string): MovieInfoConfidence {
  const queryNorm = normalizeTitle(query);
  const titleNorm = normalizeTitle(suggestion.title ?? "");
  const subTitleNorm = normalizeTitle(suggestion.sub_title ?? "");
  if (titleNorm === queryNorm || subTitleNorm === queryNorm) return "high";
  return scoreSuggestion(suggestion, queryNorm) >= 90 ? "medium" : "low";
}

export function getKnownMovieInfo(...titles: Array<string | undefined>) {
  for (const title of titles) {
    if (!title) continue;
    const info = KNOWN_MOVIES[normalizeTitle(title)];
    if (info) return info;
  }
  return undefined;
}

export function extractSubjectId(suggestion: DoubanSuggestion) {
  if (suggestion.id) return suggestion.id;
  return suggestion.url?.match(/subject\/(\d+)/)?.[1] ?? "";
}

export function extractGenres(html: string) {
  const genres = Array.from(html.matchAll(/property=["']v:genre["'][^>]*>([^<]+)/gi))
    .map((match) => htmlToPlainText(match[1]))
    .filter(Boolean);
  return Array.from(new Set(genres));
}

export function selectPrimaryGenre(genres: string[] = []) {
  return genres.find((genre) => ALLOWED_GENRES.has(genre)) ?? "";
}

export function parseAiMovieInfo(raw: string): ParsedAiMovieInfo | undefined {
  try {
    const parsed = JSON.parse(raw) as Partial<ParsedAiMovieInfo>;
    const genre = typeof parsed.genre === "string" ? parsed.genre.trim() : "";
    const keywords = typeof parsed.keywords === "string" ? sanitizeKeywords(parsed.keywords) : "";
    const confidence = parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low";
    if (!ALLOWED_GENRES.has(genre) || !keywords || confidence !== "high") return undefined;
    return { genre, keywords, confidence };
  } catch {
    return undefined;
  }
}

function scoreSuggestion(
  suggestion: DoubanSuggestion,
  queryNorm: string,
  expectedMediaType?: "movie" | "tv",
) {
  const titleNorm = normalizeTitle(suggestion.title ?? "");
  const subTitleNorm = normalizeTitle(suggestion.sub_title ?? "");
  let score = 0;

  if (titleNorm === queryNorm) score += 100;
  else if (titleNorm.includes(queryNorm) || queryNorm.includes(titleNorm)) score += 55;

  if (subTitleNorm === queryNorm) score += 80;
  else if (subTitleNorm.includes(queryNorm) || queryNorm.includes(subTitleNorm)) score += 35;

  if (suggestion.type === "movie") score += 10;
  if (expectedMediaType) {
    score += mediaTypeScore(suggestion, expectedMediaType);
  }
  if (/^(19|20)\d{2}$/.test(suggestion.year ?? "")) score += 2;

  return score;
}

function mediaTypeScore(suggestion: DoubanSuggestion, expectedMediaType: "movie" | "tv") {
  const rawType = normalizeTitle(suggestion.type ?? "");
  const rawTypes = (suggestion.types ?? []).map(normalizeTitle).join(" ");
  const text = `${rawType} ${rawTypes}`;
  const isTv = /tv|电视剧|剧集|迷你剧|连续剧|series|episode/.test(text);
  const isMovie = /movie|电影|film/.test(text) || suggestion.type === "movie";

  if (expectedMediaType === "tv") {
    if (isTv) return 24;
    if (isMovie) return -28;
    return 0;
  }

  if (isMovie) return 18;
  if (isTv) return -24;
  return 0;
}

function htmlToPlainText(raw: string) {
  return raw
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
