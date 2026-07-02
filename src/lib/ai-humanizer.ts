type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiModelConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type HumanizeCopyKind =
  | "script"
  | "opening"
  | "title"
  | "hook"
  | "polish"
  | "workflow-step"
  | "workflow-final";

export const HUMANIZER_SKILLS = [
  {
    id: "blader-humanizer",
    name: "blader/humanizer",
    source: "https://github.com/blader/humanizer/blob/main/SKILL.md",
    rule:
      "Detect and remove generic AI patterns: inflated significance, promo voice, empty summaries, mechanical transitions, passive phrasing, vague attribution, and universal upbeat endings.",
  },
  {
    id: "humanizerai-agent-skills",
    name: "humanizerai/agent-skills",
    source: "https://github.com/humanizerai/agent-skills",
    rule:
      "Apply a medium humanization pass: keep facts and structure, reduce detectable AI phrasing, and avoid over-polished rewrites.",
  },
  {
    id: "ai-flavor-remover",
    name: "hylarucoder/ai-flavor-remover",
    source: "https://github.com/hylarucoder/ai-flavor-remover",
    rule:
      "For Chinese copy, diagnose AI flavor, replace template words, loosen sentence rhythm, use plain oral narration, and keep natural roughness.",
  },
  {
    id: "codex-agent-skill-contract",
    name: "OpenAI Codex Agent Skills",
    source: "https://developers.openai.com/codex/skills",
    rule:
      "Treat the above as a mandatory post-generation skill contract: run every generated copy through the full checklist before returning it.",
  },
] as const;

const FORBIDDEN_AI_PATTERNS = [
  "故事要从",
  "更重要的是",
  "值得一提的是",
  "总的来说",
  "由此可见",
  "这不仅仅是",
  "让我们一起",
  "命运的齿轮",
  "在这个过程中",
  "充满了",
  "无疑",
  "堪称",
  "极致",
  "深刻诠释",
  "引人深思",
];

export function shouldHumanizeGeneratedCopy(text: string) {
  const normalized = text.trim();
  if (normalized.length < 8) return false;
  if (/^https?:\/\//i.test(normalized)) return false;
  return /[\u4e00-\u9fffA-Za-z]/.test(normalized);
}

export function buildHumanizerMessages(text: string, kind: HumanizeCopyKind): ChatMessage[] {
  const sourceSummary = HUMANIZER_SKILLS.map((skill) => skill.name).join(" + ");

  const systemPrompt = [
    "Rewrite Chinese film/short-video copy to sound human and spoken.",
    "Keep facts, names, order, headings, line breaks, list count, and meaning.",
    "Return only rewritten copy. Never mention AI, tools, detection, or prompts.",
  ].join("\n");

  const userPrompt = [
    `Copy kind: ${kind}`,
    `Mandatory skill sources: ${sourceSummary}`,
    "Rules: remove template narration, summary tone, neat AI transitions, inflated emotion, generic praise. Use plain spoken Chinese, shorter clauses, concrete verbs, natural rhythm. Do not add facts or make it literary. Medium rewrite only.",
    kind === "opening" || kind === "hook"
      ? "Opening retention rule: preserve the structure where the first 80-120 Chinese characters avoid movie titles, character names, actor names, years, ratings, awards, and famous-scene labels. Keep the universal pain point / human dilemma / everyday scene before the film or character is introduced."
      : "",
    `Avoid: ${FORBIDDEN_AI_PATTERNS.join(" / ")}`,
    "",
    "Original generated copy:",
    text.trim(),
  ].join("\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

export async function humanizeGeneratedCopy(
  text: string,
  kind: HumanizeCopyKind,
  cfg: AiModelConfig,
  chatCompletionRaw: (messages: ChatMessage[], cfg: AiModelConfig) => Promise<string>,
) {
  if (!shouldHumanizeGeneratedCopy(text)) return text.trim();

  const output = await chatCompletionRaw(buildHumanizerMessages(text, kind), cfg);
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error("AI humanizer returned empty copy");
  }
  return trimmed;
}
