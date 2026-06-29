"use client";

import * as React from "react";
import { useAppStore } from "@/lib/store";
import { useFenggeRecorder } from "@/lib/use-fengge-recorder";
import { recognizeAudio } from "@/lib/xfyun-asr";
import type { XfyunAsrConfig } from "@/lib/xfyun-asr";
import { Loader2, LogIn, Mic, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ----- types -----
type ChatPhase =
  | "idle"       // waiting, nothing happening
  | "listening"  // user holds mic, recording
  | "recognizing"// sending audio to ASR
  | "thinking"   // LLM generating
  | "speaking";  // TTS playing

interface AsrConfigResp {
  configured: boolean;
  appId: string;
  apiKey: string;
  apiSecret: string;
}

// ----- helpers -----
function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
  interface ISpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((e: ISpeechRecognitionEvent) => void) | null;
    onerror: ((e: ISpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
  }
  interface ISpeechRecognitionEvent extends Event {
    results: ISpeechRecognitionResultList;
  }
  interface ISpeechRecognitionResultList {
    length: number;
    [index: number]: ISpeechRecognitionResult;
  }
  interface ISpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: ISpeechRecognitionAlternative;
  }
  interface ISpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }
  interface ISpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }
}

/** 浏览器 SpeechRecognition（快速，无需 API key） */
function hasBrowserSpeechRecognition() {
  return !!(
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

export function TalkFenggeView() {
  const { user, setView } = useAppStore();
  const recorder = useFenggeRecorder();

  const [phase, setPhase] = React.useState<ChatPhase>("idle");
  const [transcript, setTranscript] = React.useState("");
  const [timerSec, setTimerSec] = React.useState(0);
  const [asrConfig, setAsrConfig] = React.useState<AsrConfigResp | null>(null);
  const [needLogin, setNeedLogin] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [answerText, setAnswerText] = React.useState("");
  const recognitionRef = React.useRef<ISpeechRecognition | null>(null);

  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const isGuest = !user;

  // phase display text
  const phaseLabel: Record<ChatPhase, string> = {
    idle: "轻按麦克风说话",
    listening: "正在听…",
    recognizing: "识别中…",
    thinking: "荒哥琢磨中…",
    speaking: "荒哥正在说…",
  };

  // ----- load ASR config -----
  React.useEffect(() => {
    fetch("/api/ai/asr-config")
      .then((r) => r.json())
      .then((d: AsrConfigResp) => setAsrConfig(d))
      .catch(() => setAsrConfig({ configured: false, appId: "", apiKey: "", apiSecret: "" }));
  }, []);

  // ----- timer for listening phase -----
  React.useEffect(() => {
    if (phase === "listening") {
      setTimerSec(0);
      timerRef.current = setInterval(() => setTimerSec((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // ----- cleanup audio on unmount -----
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ----- speaking phase: after TTS ends, go back to idle -----
  const onAudioEnded = React.useCallback(() => {
    setPhase("idle");
    setTranscript("");
  }, []);

  // ----- start recording (hold mic) -----
  const handleMicDown = async () => {
    if (needLogin) {
      toast.error("游客额度已用完，登录后可继续对话");
      return;
    }
    if (phase !== "idle") return;
    stopAudio();
    setTranscript("");
    setAnswerText("");

    // 优先用浏览器 SpeechRecognition（无需配置）
    if (hasBrowserSpeechRecognition()) {
      startBrowserSTT();
      return;
    }

    // 回落 MediaRecorder + xfyun
    if (!asrConfig?.configured) {
      toast.error("管理员尚未配置语音识别，且当前浏览器不支持原生语音识别");
      return;
    }
    if (!recorder.isSupported) {
      toast.error("当前浏览器不支持录音");
      return;
    }
    setPhase("listening");
    await recorder.start();
  };

  // ----- stop recording (release mic) -----
  const handleMicUp = async () => {
    if (phase === "listening") {
      // MediaRecorder mode
      setPhase("recognizing");
      const blob = await recorder.stop();
      if (!blob || blob.size === 0) {
        setPhase("idle");
        return;
      }
      doXfyunRecognize(blob);
    }
    // SpeechRecognition mode: the onend/onresult handler takes over
  };

  // ----- Browser SpeechRecognition -----

  const startBrowserSTT = () => {
    setPhase("listening");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setPhase("idle");
      return;
    }
    const recog = new SR();
    recog.lang = "zh-CN";
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onresult = (e: ISpeechRecognitionEvent) => {
      const last = e.results[e.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        setTranscript(text);
        if (text) {
          setPhase("thinking");
          doChat(text);
        } else {
          setPhase("idle");
        }
      } else {
        setTranscript(last[0].transcript);
      }
    };

    recog.onerror = (e: ISpeechRecognitionErrorEvent) => {
      if (e.error === "no-speech") {
        setPhase("idle");
        return;
      }
      setPhase("idle");
      toast.error("语音识别出错，请重试");
    };

    recog.onend = () => {
      if (phase === "listening") {
        setPhase("idle");
        setTranscript("");
      }
    };

    recognitionRef.current = recog;
    recog.start();
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  };

  // ----- xfyun ASR -----
  const doXfyunRecognize = async (blob: Blob) => {
    if (!asrConfig) {
      setPhase("idle");
      return;
    }
    try {
      const text = await recognizeAudio(
        blob,
        {
          appId: asrConfig.appId,
          apiKey: asrConfig.apiKey,
          apiSecret: asrConfig.apiSecret,
        } as XfyunAsrConfig,
        {
          onPartialText: (t) => setTranscript(t || ""),
        }
      );
      const trimmed = text.trim();
      if (!trimmed) {
        setPhase("idle");
        toast.error("没听清，再说一遍试试");
        return;
      }
      setTranscript(trimmed);
      setPhase("thinking");
      await doChat(trimmed);
    } catch (e) {
      setPhase("idle");
      toast.error(e instanceof Error ? e.message : "识别失败");
    }
  };

  // ----- LLM chat -----
  const doChat = async (text: string) => {
    try {
      const res = await fetch("/api/ai/fengge-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          history: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.needLogin) {
          setNeedLogin(true);
          setRemaining(0);
          setPhase("idle");
          return;
        }
        throw new Error(data?.error || "荒哥暂时没法回话");
      }
      const answer: string = data.answer || "";
      setAnswerText(answer);
      setTranscript(answer);
      if (data.sessionId) setSessionId(data.sessionId);
      if (typeof data.remainingGuestTurns === "number") {
        setRemaining(data.remainingGuestTurns);
      }
      // auto-speak the answer
      await doTTS(answer);
    } catch (e) {
      setPhase("idle");
      toast.error(e instanceof Error ? e.message : "对话失败");
    }
  };

  // ----- TTS -----
  const doTTS = async (text: string) => {
    setPhase("speaking");
    try {
      const res = await fetch("/api/ai/fengge-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "语音合成失败");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        onAudioEnded();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPhase("idle");
      };
      await audio.play();
    } catch (e) {
      setPhase("idle");
      toast.error(e instanceof Error ? e.message : "语音播放失败");
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopRecognition();
    // 如果还在录音状态，强制停止
    if (recorder.isRecording) {
      recorder.stop();
    }
    setPhase("idle");
  };

  // ----- can use mic? -----
  const micUsable =
    (hasBrowserSpeechRecognition() || !!asrConfig?.configured) &&
    recorder.isSupported &&
    !needLogin;

  // ----- render -----
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-black overflow-hidden select-none">
      {/* 背景微光 */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 45%, rgba(220, 80, 80, 0.15) 0%, transparent 70%)," +
            "radial-gradient(ellipse 60% 40% at 50% 70%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* 顶部状态 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-[13px] text-white/70 backdrop-blur-xl">
          <span
            className="h-2 w-2 rounded-full transition-all duration-500"
            style={{
              background:
                phase === "idle"
                  ? "#666"
                  : phase === "listening"
                    ? "#ff9f0a"
                    : phase === "speaking"
                      ? "#34c759"
                      : "#555",
              boxShadow:
                phase === "listening"
                  ? "0 0 8px rgba(255,159,10,0.6)"
                  : phase === "speaking"
                    ? "0 0 8px rgba(52,199,89,0.6)"
                    : "none",
            }}
          />
          <span>
            {phase === "idle"
              ? "就绪"
              : phase === "listening"
                ? "聆听中"
                : phase === "recognizing"
                  ? "识别中"
                  : phase === "thinking"
                    ? "思考中"
                    : "回复中"}
          </span>
        </div>
        <div className="text-white/30 text-[13px] tabular-nums tracking-wider">
          {phase === "listening" ? fmtTime(timerSec) : ""}
        </div>
      </div>

      {/* 中间区：转录文字 */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-8">
        <div
          className="text-center text-[22px] leading-relaxed text-white/90 max-w-lg min-h-[1.5em] transition-opacity duration-300"
          style={{
            opacity: transcript ? 1 : phase === "listening" ? 0.3 : 0,
            textShadow: "0 1px 12px rgba(0,0,0,0.8)",
          }}
        >
          {transcript || (phase === "listening" ? "说点什么…" : "")}
        </div>
        {answerText && phase !== "speaking" && phase !== "idle" && phase !== "listening" && (
          <div
            className="text-center text-[16px] leading-relaxed text-amber-200/80 max-w-md mt-4 transition-opacity duration-500"
            style={{ opacity: 1 }}
          >
            {answerText}
          </div>
        )}
        {/* 游客限额 */}
        {isGuest && remaining !== null && remaining <= 3 && !needLogin && (
          <div className="mt-6 text-[12px] text-amber-400/60">
            访客还可对话 {remaining} 次
          </div>
        )}
      </div>

      {/* 底部控制 */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 pb-12">
        {needLogin ? (
          <Button
            onClick={() => setView("auth")}
            className="rounded-full px-6 h-11"
          >
            <LogIn className="mr-2 h-4 w-4" />
            登录后继续对话
          </Button>
        ) : (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              handleMicDown();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              handleMicUp();
            }}
            onPointerLeave={() => {
              if (phase === "listening") handleMicUp();
            }}
            disabled={!micUsable}
            className="group relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 transition-all duration-300 outline-none disabled:opacity-30"
            style={{
              borderColor:
                phase === "listening"
                  ? "rgba(52,199,89,0.7)"
                  : phase === "speaking"
                    ? "rgba(52,199,89,0.5)"
                    : "#444",
              background:
                phase === "listening"
                  ? "rgba(52,199,89,0.08)"
                  : "rgba(14,14,18,0.6)",
              boxShadow:
                phase === "listening"
                  ? "0 0 28px rgba(52,199,89,0.22), inset 0 0 14px rgba(52,199,89,0.06)"
                  : phase === "speaking"
                    ? "0 0 28px rgba(52,199,89,0.12)"
                    : "none",
              transform: phase === "listening" ? "scale(1.05)" : "scale(1)",
              animation:
                phase === "speaking" ? "pulse-soft 2s ease-in-out infinite" : "none",
            }}
            title="按住说话"
          >
            {phase === "recognizing" || phase === "thinking" ? (
              <Loader2 className="h-7 w-7 animate-spin text-white/60" />
            ) : phase === "speaking" ? (
              <Volume2 className="h-7 w-7 text-[#6fe08e]" />
            ) : phase === "listening" ? (
              <Square className="h-6 w-6 text-[#6fe08e]" style={{ fill: "#6fe08e" }} />
            ) : (
              <Mic className="h-7 w-7 text-[#cfcfd6]" />
            )}
          </button>
        )}
        <div className="text-[13px] text-white/40 tabular-nums tracking-wider">
          {needLogin ? "" : phaseLabel[phase]}
        </div>
        {!micUsable && !needLogin && (
          <div className="text-[12px] text-rose-400/60 max-w-xs text-center px-4">
            当前环境不支持录音，请使用 Chrome/Edge 浏览器，或让管理员配置讯飞语音识别。
          </div>
        )}
      </div>
    </div>
  );
}

// ----- SpeechRecognition types -----
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
