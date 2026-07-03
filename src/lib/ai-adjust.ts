import "server-only";
import { chatCompletionRaw, getActiveAiModel, type AiUserContext } from "@/lib/ai";

/**
 * 根据用户指令调整文案内容。
 * 调用 AI 模型对 fullText 按 prompt 要求做修改，返回调整后的完整文案。
 */
export async function adjustTextWithAI(
  params: { originalText: string; prompt: string; fullText: string },
  ctx?: AiUserContext,
): Promise<string> {
  const systemPrompt = [
    "你是一位专业的文案编辑助手。你的任务是根据用户的要求修改文案。",
    "请直接输出修改后的完整文案，不要加任何解释。",
    "保留原文的整体结构和风格，只根据用户指令做调整。",
    "如果用户要求缩短字数，请精简表述但不丢失核心信息。",
    "如果用户要求扩充字数，请丰富细节但不偏离主题。",
    "如果用户要求调整语气或风格，请相应调整措辞。",
    "输出必须包含完整的文案，不能只输出修改的部分。",
  ].join("\n");

  const userPrompt = [
    "【用户指令】",
    params.prompt,
    "",
    "【原文案】",
    params.fullText,
    "",
    "请根据用户指令修改文案，输出完整修改后的文案：",
  ].join("\n");

  const cfg = await getActiveAiModel(ctx);
  if (!cfg) throw new Error("未配置可用的 AI 模型");

  return await chatCompletionRaw(
    [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ],
    cfg,
  );
}
