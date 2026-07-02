/**
 * 讯飞语音听写（ASR）前端模块
 *
 * 参考 voice-to-text-tools 项目，使用讯飞 WebSocket API 进行语音识别。
 * 流程：
 * 1. 将音频文件（File/Blob）通过浏览器 AudioContext 转为 16kHz 单声道 PCM
 * 2. 按 59 秒分段（讯飞听写单次最多 60 秒）
 * 3. 通过 WebSocket 逐段发送 PCM 数据
 * 4. 合并所有段识别结果
 *
 * 讯飞听写 API 文档：https://www.xfyun.cn/doc/asr/voicedictation/API.html
 */

export interface XfyunAsrConfig {
  appId: string;
  apiKey: string;
  apiSecret: string;
}

export interface AsrProgressCallback {
  onStatus?: (status: string) => void;
  onProgress?: (percent: number) => void;
  onPartialText?: (text: string) => void;
}

/** 讯飞听写每段最大秒数 */
const SEGMENT_SECONDS = 59;
/** PCM 采样率 */
const PCM_RATE = 16000;

/**
 * 生成讯飞 WebSocket 鉴权 URL
 */
async function createWsUrl(apiKey: string, apiSecret: string): Promise<string> {
  const host = "iat-api.xfyun.cn";
  const path = "/v2/iat";
  const date = new Date().toUTCString();
  const signOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

  // HMAC-SHA256 签名
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, enc.encode(signOrigin));
  const signature = btoa(
    String.fromCharCode.apply(null, Array.from(new Uint8Array(signed)))
  );

  const authOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const auth = btoa(authOrigin);

  return `wss://${host}${path}?authorization=${encodeURIComponent(auth)}&date=${encodeURIComponent(date)}&host=${host}`;
}

/**
 * 将字节数组转为 Base64（分块处理避免栈溢出）
 */
function toBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

/**
 * 将音频文件（File/Blob）转为 16kHz 单声道 PCM
 * 使用浏览器 AudioContext + OfflineAudioContext
 */
async function audioToPcm16k(file: Blob): Promise<Uint8Array> {
  const raw = await file.arrayBuffer();
  const AudioCtx =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) throw new Error("当前浏览器不支持 AudioContext");

  const decodeCtx = new AudioCtx();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await decodeCtx.decodeAudioData(raw.slice(0));
  } catch {
    throw new Error(
      "音频解码失败，请尝试转换为 MP3/WAV/MP4(H264+AAC) 后重试"
    );
  }

  // 混音为单声道
  const mono = new Float32Array(audioBuffer.length);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      mono[i] += data[i] / audioBuffer.numberOfChannels;
    }
  }

  // 重采样到 16kHz
  const targetLength = Math.ceil(
    (mono.length * PCM_RATE) / audioBuffer.sampleRate
  );
  const offline = new OfflineAudioContext(1, targetLength, PCM_RATE);
  const temp = offline.createBuffer(1, mono.length, audioBuffer.sampleRate);
  temp.copyToChannel(mono, 0, 0);
  const src = offline.createBufferSource();
  src.buffer = temp;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  const out = rendered.getChannelData(0);

  // Float32 → Int16 PCM
  const pcm = new Int16Array(out.length);
  for (let j = 0; j < out.length; j++) {
    const s = Math.max(-1, Math.min(1, out[j]));
    pcm[j] = s < 0 ? s * 32768 : s * 32767;
  }

  decodeCtx.close();
  return new Uint8Array(pcm.buffer);
}

/**
 * 将 PCM 按秒数分段
 */
function splitPcmBySeconds(bytes: Uint8Array, secondsPerPart: number): Uint8Array[] {
  const bytesPerSecond = PCM_RATE * 2; // 16bit = 2 bytes per sample
  const partBytes = Math.max(2, Math.floor((secondsPerPart * bytesPerSecond) / 2) * 2);
  const list: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += partBytes) {
    list.push(bytes.subarray(i, Math.min(i + partBytes, bytes.length)));
  }
  return list;
}

/**
 * 合并识别结果（按 sn 排序）
 */
function mergeResult(resultMap: Map<number, string>): string {
  return Array.from(resultMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map((item) => item[1])
    .join("");
}

/**
 * 识别单段 PCM 音频
 */
function recognizeSegment(options: {
  appId: string;
  apiKey: string;
  apiSecret: string;
  pcmPart: Uint8Array;
  onPartialText?: (text: string) => void;
  onUploadProgress?: (ratio: number) => void;
}): Promise<string> {
  const { appId, apiKey, apiSecret, pcmPart } = options;

  return new Promise(async (resolve, reject) => {
    let ws: WebSocket;
    try {
      const wsUrl = await createWsUrl(apiKey, apiSecret);
      ws = new WebSocket(wsUrl);
    } catch (e) {
      reject(new Error("生成讯飞鉴权 URL 失败"));
      return;
    }

    const segMap = new Map<number, string>();
    let finished = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const doneOk = (text: string) => {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      resolve(text || "");
    };

    const doneFail = (err: Error) => {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      reject(err);
    };

    ws.onopen = () => {
      const frameSize = 5120; // 每帧 5120 字节
      const intervalMs = 10; // 每 10ms 发送一帧
      let offset = 0;
      let first = true;

      timer = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          if (timer) clearInterval(timer);
          return;
        }

        const end = Math.min(offset + frameSize, pcmPart.length);
        const chunk = pcmPart.subarray(offset, end);
        let status = 1; // 中间帧
        if (first) status = 0; // 第一帧
        if (end >= pcmPart.length) status = 2; // 最后一帧

        const payload: Record<string, unknown> = {
          data: {
            status,
            format: "audio/L16;rate=16000",
            encoding: "raw",
            audio: toBase64(chunk),
          },
        };

        // 第一帧携带 common 和 business 参数
        if (first) {
          payload.common = { app_id: appId };
          payload.business = {
            language: "zh_cn",
            domain: "iat",
            accent: "mandarin",
            dwa: "wpgs",
          };
        }

        ws.send(JSON.stringify(payload));
        first = false;
        offset = end;
        options.onUploadProgress?.(Math.min(1, offset / pcmPart.length));
        if (status === 2 && timer) {
          clearInterval(timer);
          timer = null;
        }
      }, intervalMs);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.code !== 0) {
          ws.close();
          doneFail(
            new Error(`${msg.message || "接口返回错误"}（${msg.code}）`)
          );
          return;
        }

        if (msg.data?.result) {
          const r = msg.data.result;
          const sn = Number(r.sn || 0);
          const text = (r.ws || [])
            .map((item: any) =>
              (item.cw || [])
                .map((cw: any) => cw.w || "")
                .join("")
            )
            .join("");

          // 动态修正（wpgs 模式）
          if (r.pgs === "rpl" && Array.isArray(r.rg) && r.rg.length === 2) {
            const start = Number(r.rg[0]);
            const end = Number(r.rg[1]);
            segMap.forEach((_, key) => {
              if (key >= start && key <= end) segMap.delete(key);
            });
          }

          segMap.set(sn, text);
          options.onPartialText?.(mergeResult(segMap));
        }

        if (msg.data?.status === 2) {
          doneOk(mergeResult(segMap));
          ws.close();
        }
      } catch (e) {
        doneFail(new Error(`解析识别结果失败：${(e as Error).message}`));
      }
    };

    ws.onerror = () => {
      doneFail(new Error("WebSocket 连接失败，请检查 API 配置和网络"));
    };

    ws.onclose = () => {
      if (!finished) doneFail(new Error("连接已关闭，未拿到该段完整识别结果"));
    };
  });
}

/**
 * 完整的语音识别流程
 *
 * @param audioFile 音频/视频文件（Blob/File）
 * @param config 讯飞 API 配置
 * @param callbacks 进度回调
 * @returns 识别完成的完整文本
 */
export async function recognizeAudio(
  audioFile: Blob,
  config: XfyunAsrConfig,
  callbacks?: AsrProgressCallback
): Promise<string> {
  const { appId, apiKey, apiSecret } = config;
  if (!appId || !apiKey || !apiSecret) {
    throw new Error("请先填写讯飞 API 配置（APPID / API Key / API Secret）");
  }

  // 1. 转换为 PCM
  callbacks?.onStatus?.("正在转换为 16kHz 单声道 PCM…");
  callbacks?.onProgress?.(2);
  const pcmBytes = await audioToPcm16k(audioFile);
  callbacks?.onProgress?.(7);

  // 2. 分段
  const parts = splitPcmBySeconds(pcmBytes, SEGMENT_SECONDS);
  const mergedParts: string[] = [];
  callbacks?.onStatus?.(`已自动分段，共 ${parts.length} 段，开始识别…`);

  // 3. 逐段识别
  for (let i = 0; i < parts.length; i++) {
    const baseText = mergedParts.join("");
    callbacks?.onStatus?.(`第 ${i + 1}/${parts.length} 段识别中…`);

    const segmentText = await recognizeSegment({
      appId,
      apiKey,
      apiSecret,
      pcmPart: parts[i],
      onUploadProgress: (ratio) => {
        const p = 10 + ((i + Math.min(0.93, ratio)) / parts.length) * 85;
        callbacks?.onProgress?.(p);
      },
      onPartialText: (partial) => {
        callbacks?.onPartialText?.(baseText + partial);
      },
    });

    mergedParts.push(segmentText);
    callbacks?.onPartialText?.(mergedParts.join(""));
    callbacks?.onProgress?.(10 + ((i + 1) / parts.length) * 85);
  }

  callbacks?.onProgress?.(100);
  callbacks?.onStatus?.("语音识别完成");

  return mergedParts.join("");
}
