"use client";

import * as React from "react";

export interface FenggeRecorderState {
  /** 是否正在录音 */
  isRecording: boolean;
  /** 浏览器是否支持录音 */
  isSupported: boolean;
  /** 最近一次错误信息 */
  error: string | null;
  /** 开始录音 */
  start: () => Promise<void>;
  /** 停止录音并返回音频 Blob */
  stop: () => Promise<Blob | null>;
}

/**
 * 麦克风录音 hook：getUserMedia + MediaRecorder → webm Blob。
 * 返回的 Blob 可直接喂给 xfyun-asr 的 recognizeAudio（已支持任意音频解码为 16k PCM）。
 *
 * 用法：
 *   const rec = useFenggeRecorder();
 *   await rec.start();  // 按下说话
 *   const blob = await rec.stop();  // 松开
 */
export function useFenggeRecorder(): FenggeRecorderState {
  const [isRecording, setIsRecording] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const resolverRef = React.useRef<((blob: Blob) => void) | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof MediaRecorder !== "undefined";

  const cleanupStream = React.useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  }, []);

  const start = React.useCallback(async () => {
    if (!isSupported) {
      setError("当前浏览器不支持录音");
      return;
    }
    if (isRecording || mediaRecorderRef.current) {
      // 已在录音，忽略
      return;
    }
    setError(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 优先选 webm/opus；不支持则回落默认
      let mimeType: string | undefined;
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];
      for (const m of candidates) {
        if (MediaRecorder.isTypeSupported?.(m)) {
          mimeType = m;
          break;
        }
      }
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        cleanupStream();
        setIsRecording(false);
        resolverRef.current?.(blob);
        resolverRef.current = null;
      };
      recorder.onerror = (ev) => {
        const err = (ev as unknown as { error?: Error }).error;
        setError(err?.message || "录音出错");
        mediaRecorderRef.current = null;
        cleanupStream();
        setIsRecording(false);
        resolverRef.current?.(new Blob([], { type: "" }));
        resolverRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch (e) {
      const err = e as Error & { name?: string };
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setError("麦克风权限被拒绝，请在浏览器设置中允许使用麦克风");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setError("未检测到麦克风设备");
      } else {
        setError(err?.message || "无法启动录音");
      }
      cleanupStream();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  }, [isRecording, isSupported, cleanupStream]);

  const stop = React.useCallback((): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      mediaRecorderRef.current = null;
      cleanupStream();
      setIsRecording(false);
      return Promise.resolve(null);
    }
    return new Promise<Blob | null>((resolve) => {
      resolverRef.current = (blob) => resolve(blob.size === 0 ? null : blob);
      try {
        recorder.stop();
      } catch {
        mediaRecorderRef.current = null;
        cleanupStream();
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [cleanupStream]);

  // 卸载时清理
  React.useEffect(() => {
    return () => {
      try {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
      cleanupStream();
    };
  }, [cleanupStream]);

  return { isRecording, isSupported, error, start, stop };
}