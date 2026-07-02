import { NextRequest, NextResponse } from "next/server";
import { generateTTS } from "@/lib/ai";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

/** 确保 MIMO_API_KEY 可用：环境变量优先，回退到 AI 模型表 */
async function ensureTtsApiKey() {
  if (process.env.MIMO_API_KEY) return;
  try {
    const ttsModel = await db.aiModel.findFirst({
      where: {
        OR: [
          { baseUrl: { contains: "xiaomimimo" } },
          { baseUrl: { contains: "mimo" } },
          { name: { contains: "TTS" } },
          { name: { contains: "mimo" } },
        ],
        isActive: true,
      },
      orderBy: { isDefault: "desc" },
    });
    if (ttsModel?.apiKey) {
      process.env.MIMO_API_KEY = ttsModel.apiKey;
    }
  } catch {
    // 静默
  }
}

export async function POST(req: NextRequest) {
  try {
    // 兼容 JSON 和 FormData 两种请求
    let text = "";
    let voice: string | undefined;
    let speed: number | undefined;
    let mode = "preset";
    let style: string | undefined;
    let refFile: File | undefined;

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data") || ct.includes("form-data")) {
      const form = await req.formData();
      text = (form.get("text") as string)?.trim() || "";
      mode = (form.get("mode") as string) || "preset";
      style = (form.get("style") as string) || undefined;
      voice = (form.get("presetVoice") as string) || (form.get("voice") as string) || undefined;
      const speedStr = form.get("speed") as string;
      if (speedStr) speed = parseFloat(speedStr);
      refFile = form.get("reference") as File || undefined;
    } else {
      const body = await req.json();
      text = (body.text as string)?.trim() || "";
      mode = (body.mode as string) || "preset";
      style = (body.style as string) || undefined;
      voice = (body.presetVoice as string) || (body.voice as string) || undefined;
      speed = body.speed as number | undefined;
    }

    if (!text) {
      return NextResponse.json({ error: "请输入要试听的文案" }, { status: 400 });
    }

    await ensureTtsApiKey();

    // clone 模式
    if (mode === "clone") {
      if (!refFile) {
        return NextResponse.json({ error: "音色复刻需要上传参考音频" }, { status: 400 });
      }
      const arrayBuffer = await refFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mime = refFile.type || "audio/wav";
      const { mimoGenerateTTS } = await import("@/lib/mimo-tts");
      const result = await mimoGenerateTTS({
        text,
        mode: "clone",
        referenceAudioDataUri: `data:${mime};base64,${base64}`,
        style,
      } as any);
      const buffer = (result as any).buffer as Buffer;
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": (result as any).mime || "audio/wav",
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "no-cache",
        },
      });
    }

    // preset / design 模式
    const result = await generateTTS({ text, voice, speed, mode, style });
    const buffer = (result as any).buffer as Buffer;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": (result as any).mime || "audio/wav",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("tts error:", e);
    const message = e instanceof Error ? e.message : "语音合成失败";
    return NextResponse.json(
      { error: `TTS失败: ${message}` },
      { status: 500 }
    );
  }
}
