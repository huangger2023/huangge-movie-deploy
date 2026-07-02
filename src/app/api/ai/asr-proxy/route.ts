import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { spawn, execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdtempSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import WebSocket from "ws";

export const runtime = "nodejs";
export const maxDuration = 120;

const XFYUN_APP_ID = process.env.XFYUN_APP_ID || "";
const XFYUN_API_KEY = process.env.XFYUN_API_KEY || "";
const XFYUN_API_SECRET = process.env.XFYUN_API_SECRET || "";

/** ffmpeg 转音频为 16kHz PCM */
function toPcm(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tmpDir = mkdtempSync(join(tmpdir(), "asr-"));
    const inFile = join(tmpDir, "in.webm");
    const outFile = join(tmpDir, "out.pcm");
    try {
      writeFileSync(inFile, input);
      const sz = statSync(inFile).size;
      if (sz === 0) { reject(new Error("写入文件为空")); return; }
    } catch (e: any) {
      reject(new Error("写入失败: " + e.message));
      return;
    }

    try {
      execSync(`"ffmpeg" -y -i "${inFile}" -f s16le -acodec pcm_s16le -ar 16000 -ac 1 "${outFile}"`, {
        timeout: 30000,
        windowsHide: true,
      });
      const result = readFileSync(outFile);
      resolve(result);
    } catch (e: any) {
      try { unlinkSync(inFile); } catch {}
      try { unlinkSync(outFile); } catch {}
      try { execSync(`rd /s /q "${tmpDir}"`); } catch {}
    }
  });
}

/** 讯飞 ASR WebSocket */
function doAsr(pcm: Buffer): Promise<string> {
  return new Promise((resolve) => {
    const host = "iat-api.xfyun.cn", path = "/v2/iat";
    const date = new Date().toUTCString();
    const sig = createHmac("sha256", XFYUN_API_SECRET).update(`host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`).digest("base64");
    const authOrigin = `api_key="${XFYUN_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${sig}"`;
    const auth = Buffer.from(authOrigin).toString("base64");
    const wsUrl = `wss://${host}${path}?authorization=${encodeURIComponent(auth)}&date=${encodeURIComponent(date)}&host=${host}`;
    console.log(`[asr] 连接讯飞 ASR...`);
    const ws = new WebSocket(wsUrl);
    const texts: string[] = [];
    let offset = 0;
    let done = false;
    const finish = (r: string) => { if (!done) { done = true; try { ws.close(); } catch {} resolve(r); } };
    setTimeout(() => finish(texts.join("")), 20000);
    ws.on("open", () => {
      const send = () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const end = Math.min(offset + 5120, pcm.length);
        const status = offset === 0 ? 0 : end >= pcm.length ? 2 : 1;
        const d: any = { data: { status, format: "audio/L16;rate=16000", encoding: "raw", audio: pcm.subarray(offset, end).toString("base64") } };
        if (offset === 0) { d.common = { app_id: XFYUN_APP_ID }; d.business = { language: "zh_cn", domain: "iat", accent: "mandarin", dwa: "wpgs" }; }
        ws.send(JSON.stringify(d));
        offset = end;
        if (status < 2) setTimeout(send, 10);
        else finish(texts.join(""));
      };
      send();
    });
    ws.on("message", (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.data?.result?.ws) texts.push(m.data.result.ws.map((w: any) => w.cw?.[0]?.w || "").join(""));
        if (m.data?.status === 2) finish(texts.join(""));
      } catch {}
    });
    ws.on("error", () => finish(""));
  });
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get("audio") as File;
    if (!file) return NextResponse.json({ error: "请上传音频" }, { status: 400 });
    const raw = Buffer.from(await file.arrayBuffer());
    console.log(`[asr] 音频 ${raw.length}B name=${file.name} type=${file.type}`);
    if (raw.length < 100) return NextResponse.json({ error: "音频太短" }, { status: 400 });
    const pcm = await toPcm(raw);
    console.log(`[asr] PCM ${pcm.length}B`);
    const text = await doAsr(pcm);
    console.log(`[asr] 结果 "${text}"`);
    return NextResponse.json({ text });
  } catch (e: any) {
    console.error("[asr] 失败:", e.message);
    return NextResponse.json({ error: e.message || "语音识别失败" }, { status: 500 });
  }
}
