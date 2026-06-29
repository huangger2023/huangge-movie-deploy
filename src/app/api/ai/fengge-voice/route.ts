import { NextRequest, NextResponse } from "next/server";
import { mimoGenerateLongTTS } from "@/lib/mimo-tts";
import { MimoTtsError } from "@/lib/mimo-tts-policy";
import {
  MIMO_DEFAULT_PRESET_VOICE,
  type MimoTtsMode,
} from "@/lib/mimo-voices";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_TTS_CHARS = 600;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/ai/fengge-voice
 * body: { text: string }
 *
 * 读 SystemSetting `fengge_voice`（管理员配置的荒哥参考音频 dataURI）：
 * - 有 → clone 模式（语音克隆荒哥音色）
 * - 无 → preset 模式（回落默认预置音色）
 *
 * 返回 audio/wav 二进制；失败返回 JSON {error}。
 */
export async function POST(req: NextRequest) {
  try {
    // 鉴权：登录用户与游客都允许（游客限额已在 fengge-chat 控制）。
    // 这里只取用户上下文，不强制。
    const user = await getCurrentUser();

    const body = await req.json();
    const text = String(body?.text || "").trim();
    if (!text) return jsonError("请输入要朗读的内容");

    // 截断超长文本，避免合成耗时过长
    const safeText = text.slice(0, MAX_TTS_CHARS);

    // 读取荒哥参考音频配置
    let referenceAudioDataUri: string | undefined;
    try {
      const row = await db.systemSetting.findUnique({
        where: { key: "fengge_voice" },
      });
      if (row?.value && row.value.startsWith("data:")) {
        referenceAudioDataUri = row.value;
      }
    } catch {
      referenceAudioDataUri = undefined;
    }

    let mode: MimoTtsMode = "preset";
    let presetVoice: string | undefined = MIMO_DEFAULT_PRESET_VOICE;
    if (referenceAudioDataUri) {
      mode = "clone";
      presetVoice = undefined;
    }

    const { buffer, mime } = await mimoGenerateLongTTS({
      mode,
      text: safeText,
      presetVoice,
      referenceAudioDataUri,
    } as Parameters<typeof mimoGenerateLongTTS>[0]);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("fengge-voice error", e);
    if (e instanceof MimoTtsError) {
      return jsonError(
        e.message,
        e.isRateLimited ? 429 : e.status || 500
      );
    }
    return jsonError(e instanceof Error ? e.message : "语音合成失败", 500);
  }
}