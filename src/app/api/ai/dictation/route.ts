import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

/** 生成讯飞 WebSocket 鉴权 URL */
async function createWsUrl(apiKey: string, apiSecret: string): Promise<string> {
  const host = "iat-api.xfyun.cn";
  const path = "/v2/iat";
  const date = new Date().toUTCString();
  const signOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, enc.encode(signOrigin));
  const signature = Buffer.from(new Uint8Array(signed)).toString("base64");

  const authOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const auth = Buffer.from(authOrigin).toString("base64");

  return `wss://${host}${path}?authorization=${encodeURIComponent(auth)}&date=${encodeURIComponent(date)}&host=${host}`;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/** 解析讯飞 WebSocket 返回的文本 */
function parseResult(msg: any): { text: string; finished: boolean } {
  const data = msg.data;
  if (!data?.result) return { text: "", finished: data?.status === 2 };

  const text = (data.result.ws || [])
    .map((item: any) =>
      (item.cw || []).map((cw: any) => cw.w || "").join("")
    )
    .join("");

  return { text, finished: data.status === 2 };
}

export async function POST(req: NextRequest) {
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length < 1000) {
      return NextResponse.json({ error: "音频太短" }, { status: 400 });
    }

    // 解析 WAV header，提取 raw PCM
    let pcm = buf;
    if (buf.length >= 44) {
      const riff = buf.slice(0, 4).toString();
      const wave = buf.slice(8, 12).toString();
      if (riff === "RIFF" && wave === "WAVE") {
        pcm = buf.subarray(44); // 跳过 44 字节 WAV header
      }
    }
    if (pcm.length < 1000) {
      return NextResponse.json({ error: "音频数据不足" }, { status: 400 });
    }

    // 获取讯飞配置
    const row = await db.systemSetting.findUnique({
      where: { key: "xfyun_asr_config" },
    });
    if (!row?.value) {
      return NextResponse.json({ error: "未配置讯飞 ASR，请联系管理员" }, { status: 500 });
    }

    let config: { appId: string; apiKey: string; apiSecret: string };
    try {
      config = JSON.parse(row.value);
    } catch {
      return NextResponse.json({ error: "讯飞配置格式错误" }, { status: 500 });
    }

    if (!config.appId || !config.apiKey || !config.apiSecret) {
      return NextResponse.json({ error: "讯飞 ASR 配置不完整" }, { status: 500 });
    }

    // 生成 WebSocket URL
    const wsUrl = await createWsUrl(config.apiKey, config.apiSecret);

    // 动态导入 ws（Next.js Edge 不支持）
    const { WebSocket } = await import("ws");

    return await new Promise<NextResponse>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      let finished = false;
      let finalText = "";
      let sentFirst = false;
      let timer: NodeJS.Timeout | null = null;
      const FRAME_SIZE = 5120; // 每帧字节数
      const INTERVAL_MS = 10;

      const cleanup = () => {
        if (timer) clearInterval(timer);
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };

      let pcmOffset = 0;
      const pcmBuf = pcm;
      ws.onopen = () => {
        timer = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const end = Math.min(pcmOffset + FRAME_SIZE, pcmBuf.length);
          const chunk = pcmBuf.subarray(pcmOffset, end);
          let status = 1;
          if (!sentFirst) status = 0;
          if (end >= pcmBuf.length) status = 2;

          const payload: Record<string, unknown> = {
            data: {
              status,
              format: "audio/L16;rate=16000",
              encoding: "raw",
              audio: toBase64(chunk),
            },
          };

          if (!sentFirst) {
            payload.common = { app_id: config.appId };
            payload.business = {
              language: "zh_cn",
              domain: "iat",
              accent: "mandarin",
              dwa: "wpgs",
            };
            sentFirst = true;
          }

          ws.send(JSON.stringify(payload));
          pcmOffset = end;

          if (status === 2) {
            if (timer) clearInterval(timer);
            timer = null;
          }
        }, INTERVAL_MS);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data.toString());
          if (msg.code !== 0) {
            cleanup();
            resolve(NextResponse.json({ error: `${msg.message || "讯飞接口错误"}（${msg.code}）` }, { status: 500 }));
            return;
          }

          const { text, finished: isEnd } = parseResult(msg);
          if (text) finalText += text;

          if (isEnd) {
            finished = true;
            cleanup();
            const result = (finalText || "").trim();
            if (!result) {
              resolve(NextResponse.json({ error: "未识别到文字，请重试" }, { status: 422 }));
            } else {
              resolve(NextResponse.json({ text: result }));
            }
          }
        } catch (e) {
          // 忽略解析错误，继续等待
        }
      };

      ws.onerror = () => {
        cleanup();
        resolve(NextResponse.json({ error: "讯飞 WebSocket 连接失败" }, { status: 500 }));
      };

      ws.onclose = () => {
        if (!finished) {
          cleanup();
          if (finalText.trim()) {
            resolve(NextResponse.json({ text: finalText.trim() }));
          } else {
            resolve(NextResponse.json({ error: "讯飞连接已关闭，未拿到识别结果" }, { status: 500 }));
          }
        }
      };

      // 超时保护
      setTimeout(() => {
        if (!finished) {
          cleanup();
          resolve(NextResponse.json({ error: "语音识别超时" }, { status: 500 }));
        }
      }, 60000);
    });
  } catch (e) {
    console.error("dictation error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "语音识别失败" },
      { status: 500 }
    );
  }
}
