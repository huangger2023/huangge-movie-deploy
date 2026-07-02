import "server-only";
import type { MimoTtsMode } from "@/lib/mimo-voices";
import {
  createMimoTtsError,
  getTtsConcurrencyForMode,
  getTtsRetryDelaysForMode,
  MimoTtsError,
} from "@/lib/mimo-tts-policy";

/**
 * 小米 MiMo TTS server-only 封装。
 *
 * 统一端点：POST https://api.xiaomimimo.com/v1/chat/completions
 * 鉴权头：api-key: $MIMO_API_KEY（注意不是 Bearer）
 * 流式已降级为"推理完一次性返回"，故一律 stream:false。
 *
 * 三模型同构，差异只在 model + audio：
 * - preset:  mimo-v2.5-tts            audio={format, voice:"音色名"}
 * - design:   mimo-v2.5-tts-voicedesign audio={format, optimize_text_preview:true}
 *                                    user message = 音色风格描述
 * - clone:    mimo-v2.5-tts-voiceclone audio={format:"wav", voice:"data:MIME;base64,参考音频"}
 *
 * 请求 format 一律用 wav，保证浏览器 <audio> 可直接播。
 */

const MIMO_ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions";
const MIMO_AUDIO_FORMAT = "wav";

/** 三模型与 mode 的映射 */
const MIMO_MODEL_BY_MODE: Record<MimoTtsMode, string> = {
  preset: "mimo-v2.5-tts",
  design: "mimo-v2.5-tts-voicedesign",
  clone: "mimo-v2.5-tts-voiceclone",
};

/** 单块目标字符数（MiMo 单次有上限，按长文本分段用）。宁可偏小以稳。 */
const MIMO_CHUNK_MAX_CHARS = 180;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 把任意长文案切成适合 MiMo 单次调用的片段。
 * 优先断点：换行 > 中文/英文句末标点（。！？!?…）> 中顿标点（，,；;）> 硬切。
 * 保留尾部标点以维持语调自然。短于 maxChars 的文案返回单段。
 */
export function splitTextForTts(text: string, maxChars = MIMO_CHUNK_MAX_CHARS): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= maxChars) return [t];

  const chunks: string[] = [];
  const push = (s: string) => {
    const v = s.trim();
    if (v) chunks.push(v);
  };

  // 先按换行粗分
  for (const para of t.split(/\n+/)) {
    const p = para.trim();
    if (!p) continue;
    if (p.length <= maxChars) {
      push(p);
      continue;
    }
    // 按句末标点细分
    const sentences = p.split(/(?<=[。！？!?\.…])/);
    let buf = "";
    for (const sRaw of sentences) {
      const s = sRaw;
      if (!s) continue;
      if ((buf + s).length <= maxChars) {
        buf += s;
        continue;
      }
      if (buf) {
        push(buf);
        buf = "";
      }
      if (s.length <= maxChars) {
        buf = s;
        continue;
      }
      // 句子本身超长 → 按中顿标点切
      const subs = s.split(/(?<=[，,；;])/);
      let b2 = "";
      for (const sub of subs) {
        if (!sub) continue;
        if ((b2 + sub).length <= maxChars) {
          b2 += sub;
          continue;
        }
        if (b2) {
          push(b2);
          b2 = "";
        }
        if (sub.length <= maxChars) {
          b2 = sub;
          continue;
        }
        // 仍超长 → 硬切
        for (let i = 0; i < sub.length; i += maxChars) {
          push(sub.slice(i, i + maxChars));
        }
      }
      if (b2) push(b2);
      buf = "";
    }
    if (buf) push(buf);
  }
  return chunks;
}

/** 简易 WAV 解析：取 fmt 与 data chunk 的 PCM（标准 PCM WAV 头）。 */
type WavMeta = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  pcm: Buffer;
};
function extractWavPcm(wav: Buffer): WavMeta {
  if (
    wav.length < 44 ||
    wav.toString("ascii", 0, 4) !== "RIFF" ||
    wav.toString("ascii", 8, 12) !== "WAVE"
  ) {
    // 不是标准 WAV：当作裸 PCM 兜底（默认 MiMo 24kHz/16bit/mono）
    return { sampleRate: 24000, channels: 1, bitsPerSample: 16, pcm: wav };
  }
  let sampleRate = 24000;
  let channels = 1;
  let bitsPerSample = 16;
  let pcm: Buffer = Buffer.alloc(0);
  let off = 12;
  while (off + 8 <= wav.length) {
    const id = wav.toString("ascii", off, off + 4);
    const size = wav.readUInt32LE(off + 4);
    if (id === "fmt " && off + 24 <= wav.length) {
      channels = wav.readUInt16LE(off + 10);
      sampleRate = wav.readUInt32LE(off + 12);
      bitsPerSample = wav.readUInt16LE(off + 22);
    } else if (id === "data") {
      const end = Math.min(off + 8 + size, wav.length);
      pcm = wav.subarray(off + 8, end);
      break;
    }
    // chunk 数据按偶数字节对齐
    off += 8 + size + (size & 1);
  }
  return { sampleRate, channels, bitsPerSample, pcm };
}

/** 用裸 PCM + 参数构造一个标准 PCM WAV（44字节头）。 */
function buildWav(
  pcm: Buffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Buffer {
  const byteRate = Math.floor((sampleRate * channels * bitsPerSample) / 8);
  const blockAlign = Math.floor((channels * bitsPerSample) / 8);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** 并发池，按原始顺序返回结果。 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) || 0 },
    async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) break;
        results[i] = await fn(items[i], i);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

export interface MimoGenerateTtsParams {
  /** 模式 */
  mode: MimoTtsMode;
  /** 要合成的文案（assistant message） */
  text: string;
  /** 风格/语气自然语言指令（user message）；preset 时可携带"语速 Nx"等翻译结果 */
  style?: string;
  /** preset 模式：预置音色名（如 Chloe） */
  presetVoice?: string;
  /**
   * clone 模式：参考音频，形如 "data:audio/wav;base64,UklGRi..."。
   * 直接作为 audio.voice 透传给 API。
   */
  referenceAudioDataUri?: string;
}

export interface MimoGenerateTtsResult {
  /** PCM/WAV 二进制 */
  buffer: Buffer;
  /** MIME，固定 audio/wav */
  mime: string;
}

/**
 * 调用 MiMo TTS 合成语音，返回音频 Buffer。
 * @throws Error 当未配置密钥、API 返回非 2xx 或响应里取不到音频时。
 */
export async function mimoGenerateTTS(
  params: MimoGenerateTtsParams
): Promise<MimoGenerateTtsResult> {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "未配置 MIMO_API_KEY 环境变量，请联系管理员在 .env / Vercel 后台添加。"
    );
  }

  const text = params.text?.trim();
  if (!text) {
    throw new Error("请输入要合成的文案");
  }

  const model = MIMO_MODEL_BY_MODE[params.mode];

  // 组装 messages：user(可选风格) + assistant(文案)
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  const style = params.style?.trim();
  if (style) {
    messages.push({ role: "user", content: style });
  } else {
    // MiMo 要求 user/assistant 成对，没有风格指令时也给一个占位 user msg
    messages.push({ role: "user", content: "" });
  }
  messages.push({ role: "assistant", content: text });

  // 组装 audio：按模式差异
  let audio: Record<string, unknown>;
  switch (params.mode) {
    case "preset": {
      const voice =
        params.presetVoice?.trim() || "Chloe";
      audio = { format: MIMO_AUDIO_FORMAT, voice };
      break;
    }
    case "design": {
      audio = { format: MIMO_AUDIO_FORMAT, optimize_text_preview: true };
      break;
    }
    case "clone": {
      if (!params.referenceAudioDataUri?.startsWith("data:")) {
        throw new Error("音色复刻需要上传参考音频");
      }
      // 复刻固定 wav
      audio = { format: "wav", voice: params.referenceAudioDataUri };
      break;
    }
    default:
      throw new Error(`未知的 TTS 模式: ${params.mode}`);
  }

  const body = {
    model,
    messages,
    audio,
    stream: false,
  };

  const retryDelays = getTtsRetryDelaysForMode(params.mode);
  let resp: Response | undefined;
  let lastError: MimoTtsError | undefined;

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    resp = await fetch(MIMO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.ok) break;

    const detail = await resp.text().catch(() => "");
    lastError = createMimoTtsError(resp.status, detail);
    if (!lastError.isRateLimited || attempt === retryDelays.length) {
      throw lastError;
    }
    await sleep(retryDelays[attempt]);
  }

  if (!resp) {
    throw lastError ?? new Error("MiMo TTS 请求失败");
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw createMimoTtsError(resp.status, detail);
  }

  const data: unknown = await resp.json();

  // 防御性解析：兼容几种可能的字段路径
  const audioB64 = pickAudioBase64(data);
  if (!audioB64) {
    const raw = JSON.stringify(data).slice(0, 500);
    throw new Error(`MiMo TTS 响应里未找到音频数据。原始响应：${raw}`);
  }

  const buffer = Buffer.from(audioB64, "base64");
  return { buffer, mime: "audio/wav" };
}

/** 从 OpenAI 兼容响应里尽力取出 audio base64 字符串 */
function pickAudioBase64(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  // data.choices[0].message.audio.data  —— OpenAI 标准audio 兼容路径
  try {
    const choices = (data as Record<string, unknown>)?.choices;
    if (Array.isArray(choices)) {
      const msg = (choices[0] as Record<string, unknown>)?.message;
      const audio = (msg as Record<string, unknown>)?.audio;
      if (typeof audio === "string") return audio;
      const dataField = (audio as Record<string, unknown>)?.data;
      if (typeof dataField === "string") return dataField;
      // 兜底：audio 本身就是 base64 字符串
      if (audio && typeof audio === "object") {
        const b64 = (audio as Record<string, unknown>)?.base64;
        if (typeof b64 === "string") return b64;
      }
    }
  } catch {
    /* ignore */
  }
  // 直接顶层 base64 / audio 字段
  const topAudio = (data as Record<string, unknown>)?.audio;
  if (typeof topAudio === "string") return topAudio;
  return null;
}

/**
 * 长文案合成（字数不限）。
 *
 * 短文案直接走 mimoGenerateTTS 单次调用；
 * 长文案自动分段 → 并发合成（上限 4）→ 剥离各段 WAV 头取裸 PCM → 按段序拼接
 * → 用第一段的 fmt 重封一个统一 WAV → 回传单个完整音频。
 *
 * 任一段失败即整体失败并指明是第几段，避免拼出半截音频误导用户。
 * 注意：各段采样率默认一致（MiMo 各模型固定 24kHz/16bit/mono），若有差异会以第一段为准。
 */
export async function mimoGenerateLongTTS(
  params: MimoGenerateTtsParams
): Promise<MimoGenerateTtsResult> {
  const text = params.text?.trim();
  if (!text) throw new Error("请输入要合成的文案");
  const chunks = splitTextForTts(text);
  if (chunks.length === 0) throw new Error("请输入要合成的文案");

  // 单段：直接单次调用，原样返回标准 WAV
  if (chunks.length === 1) {
    return mimoGenerateTTS({ ...params, text: chunks[0] });
  }

  // 多段：复刻/设计模型更容易限流，按模式收敛并发。
  const wavs = await mapWithConcurrency(chunks, getTtsConcurrencyForMode(params.mode), async (chunk, i) => {
    try {
      return await mimoGenerateTTS({ ...params, text: chunk });
    } catch (e) {
      if (e instanceof MimoTtsError && e.isRateLimited) {
        throw new Error(
          `第 ${i + 1}/${chunks.length} 段合成失败：${e.message}`
        );
      }
      throw new Error(
        `第 ${i + 1}/${chunks.length} 段合成失败: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  });

  // 解析每段 WAV → 取裸 PCM
  const metas = wavs.map((w) => extractWavPcm(w.buffer));
  const base = metas[0];
  const allPcm = Buffer.concat(metas.map((m) => m.pcm));
  const out = buildWav(
    allPcm,
    base.sampleRate,
    base.channels,
    base.bitsPerSample
  );
  return { buffer: out, mime: "audio/wav" };
}
