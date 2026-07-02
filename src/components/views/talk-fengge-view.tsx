"use client";

import * as React from "react";
import { useAppStore } from "@/lib/store";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  type RemoteTrack,
  type Participant,
} from "livekit-client";

// ── 常量 ──
const TOKEN_URL = "/api/livekit/token";

// ── 工具 ──
function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type LkPhase =
  | "idle"       // 就绪，未连接
  | "connecting" // 正在连接 LiveKit
  | "connected"  // 已连接，正在对话
  | "error";     // 连接错误

export function TalkFenggeView() {
  const { user, setView } = useAppStore();

  const [phase, setPhase] = React.useState<LkPhase>("idle");
  const [timerSec, setTimerSec] = React.useState(0);
  const [livekitUrl, setLivekitUrl] = React.useState("");
  const [transcript, setTranscript] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  const roomRef = React.useRef<Room | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const isGuest = !user;

  // ── 加载 LiveKit 配置 ──
  React.useEffect(() => {
    fetch(TOKEN_URL)
      .then((r) => r.json())
      .then((d) => {
        if (d.livekitUrl) setLivekitUrl(d.livekitUrl);
      })
      .catch(() => {});
  }, []);

  // ── 定时器 ──
  React.useEffect(() => {
    if (phase === "connected") {
      timerRef.current = setInterval(() => setTimerSec((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (phase === "idle") setTimerSec(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // ── 清理 ──
  React.useEffect(() => {
    return () => {
      disconnectRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 连接 LiveKit ──
  const connect = async () => {
    setErrorMsg("");
    setTranscript("");
    setPhase("connecting");

    try {
      // 1. 获取 token
      const tokenResp = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: user?.id
            ? `user_${user.id.slice(0, 8)}`
            : `guest_${Math.random().toString(36).slice(2, 8)}`,
          name: user?.name || "访客",
          room: "huangge-chat",
        }),
      });
      if (!tokenResp.ok) {
        const d = await tokenResp.json().catch(() => ({}));
        throw new Error(d.error || "获取令牌失败");
      }
      const { token, livekitUrl: lkUrl } = await tokenResp.json();

      // 2. 创建 Room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        stopLocalTrackOnUnpublish: true,
      });
      roomRef.current = room;

      // 3. 事件监听
      room.on(RoomEvent.Connected, () => {
        setPhase("connected");
      });

      room.on(RoomEvent.Disconnected, () => {
        setPhase("idle");
        roomRef.current = null;
      });

      room.on(RoomEvent.TrackSubscribed, (_track: RemoteTrack) => {
        if (_track.kind === Track.Kind.Audio) {
          const el = document.createElement("audio");
          el.autoplay = true;
          (el as HTMLMediaElement & { playsInline?: boolean }).playsInline = true;
          el.style.display = "none";
          _track.attach(el);
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (_track: RemoteTrack) => {
        if (_track.kind === Track.Kind.Audio) {
          _track.detach();
        }
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        const aiSpeaking = speakers.some(
          (s) => s instanceof RemoteParticipant
        );
        // 如果 AI 在说话，可以显示视觉指示
      });

      room.on(
        RoomEvent.DataReceived,
        (payload: Uint8Array, _participant?: Participant) => {
          try {
            const text = new TextDecoder().decode(payload);
            if (text) setTranscript(text);
          } catch {}
        }
      );

      // 4. 连接
      await room.connect(lkUrl, token);

      // 5. 启用麦克风
      try {
        await room.localParticipant?.setMicrophoneEnabled(true);
      } catch (micErr) {
        console.warn("microphone enable error", micErr);
        toast.error("请允许麦克风权限");
      }
    } catch (err) {
      console.error("livekit connect error", err);
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "连接失败");
    }
  };

  // ── 断开连接 ──
  const disconnect = () => {
    const room = roomRef.current;
    if (room) {
      room.disconnect();
      roomRef.current = null;
    }
    setPhase("idle");
  };

  const disconnectRoom = () => {
    disconnect();
  };

  // ── 切换连接/断开 ──
  const toggleConnect = () => {
    if (phase === "connected" || phase === "connecting") {
      disconnect();
    } else {
      connect();
    }
  };

  // ── 状态文字 ──
  const statusText: Record<LkPhase, string> = {
    idle: "就绪",
    connecting: "连接中…",
    connected: "对话中",
    error: "连接失败",
  };

  const dotColor: Record<LkPhase, string> = {
    idle: "#666",
    connecting: "#ff9f0a",
    connected: "#34c759",
    error: "#ff453a",
  };

  // ── 按钮图标 ──
  const micEnabled = phase === "connected" || phase === "idle" || phase === "error";

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-black overflow-hidden select-none">
      {/* 背景微光 */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 45%, rgba(220,80,80,0.12) 0%, transparent 70%)," +
            "radial-gradient(ellipse 60% 40% at 50% 70%, rgba(245,158,11,0.06) 0%, transparent 60%)",
        }}
      />

      {/* ── 顶部状态条 ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-[13px] text-white/70 backdrop-blur-xl">
          <span
            className="h-2 w-2 rounded-full transition-all duration-500"
            style={{
              background: dotColor[phase],
              boxShadow:
                phase === "connected"
                  ? "0 0 8px rgba(52,199,89,0.6)"
                  : phase === "connecting"
                    ? "0 0 8px rgba(255,159,10,0.6)"
                    : "none",
              animation:
                phase === "connecting"
                  ? "pulse-dot 1s ease-in-out infinite"
                  : "none",
            }}
          />
          <span>{statusText[phase]}</span>
        </div>
        <div className="text-white/40 text-[13px] tabular-nums tracking-wider">
          {phase === "connected" ? fmtTime(timerSec) : ""}
        </div>
      </div>

      {/* ── 转录文字区 ── */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-8">
        <div
          className="text-center text-[22px] leading-relaxed text-white/90 max-w-lg min-h-[1.5em] transition-opacity duration-300"
          style={{
            opacity: transcript ? 1 : phase === "connected" ? 0.3 : 0,
            textShadow: "0 1px 12px rgba(0,0,0,0.8)",
          }}
        >
          {transcript ||
            (phase === "connected"
              ? "说点什么…"
              : phase === "idle"
                ? "轻按麦克风，开始对话"
                : "")}
        </div>

        {phase === "error" && (
          <div className="mt-4 max-w-sm text-center text-[14px] text-rose-400/80">
            {errorMsg || "连接失败，请检查 LiveKit 服务器是否已启动"}
          </div>
        )}
      </div>

      {/* ── 底部控制 ── */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 pb-12">
        <button
          onClick={toggleConnect}
          disabled={!micEnabled && phase !== "connecting"}
          className="group relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 transition-all duration-300 outline-none disabled:opacity-40"
          style={{
            borderColor:
              phase === "connected"
                ? "rgba(52,199,89,0.7)"
                : phase === "connecting"
                  ? "rgba(255,159,10,0.5)"
                  : phase === "error"
                    ? "rgba(255,69,58,0.5)"
                    : "#444",
            background:
              phase === "connected"
                ? "rgba(52,199,89,0.08)"
                : "rgba(14,14,18,0.6)",
            boxShadow:
              phase === "connected"
                ? "0 0 28px rgba(52,199,89,0.22), inset 0 0 14px rgba(52,199,89,0.06)"
                : "none",
          }}
          title={phase === "connected" ? "结束对话" : "开始对话"}
        >
          {phase === "connecting" ? (
            <Loader2 className="h-7 w-7 animate-spin text-white/60" />
          ) : phase === "connected" ? (
            <MicOnIcon />
          ) : phase === "error" ? (
            <RetryIcon />
          ) : (
            <MicOffIcon />
          )}
        </button>

        <div className="text-[13px] text-white/40 tracking-wider">
          {phase === "idle"
            ? "点击开始对话"
            : phase === "connecting"
              ? "连接中…"
              : phase === "connected"
                ? "点击结束对话"
                : "点击重试"}
        </div>

        {phase === "idle" && !livekitUrl && (
          <div className="text-[12px] text-amber-400/60 max-w-xs text-center px-4">
            未检测到 LiveKit 服务器配置，请在 .env 中设置
          </div>
        )}

        {phase === "connected" && (
          <div className="text-[12px] text-white/30 text-center px-8">
            直接说话即可，荒哥会实时回应
          </div>
        )}
      </div>
    </div>
  );
}

// ── 内联 SVG 图标（避免依赖 lucide 不存在的图标） ──
function MicOnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6fe08e"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#cfcfd6"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ff453a"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <path d="M21 12a9 9 0 1 1-9-9" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

// ── 全局 CSS 动画 ──
const styleSheet =
  typeof document !== "undefined"
    ? (() => {
        const s = document.createElement("style");
        s.textContent = `
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.35; }
          }
        `;
        document.head.appendChild(s);
        return s;
      })()
    : null;