"use client";

import * as React from "react";
import { useAppStore } from "@/lib/store";
import { useFenggeRecorder } from "@/lib/use-fengge-recorder";
import { recognizeAudio } from "@/lib/xfyun-asr";
import type { XfyunAsrConfig } from "@/lib/xfyun-asr";
import { BrandIcon } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Mic,
  Loader2,
  Volume2,
  Copy,
  Square,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FenggeMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface AsrConfigResp {
  configured: boolean;
  appId: string;
  apiKey: string;
  apiSecret: string;
}

const QUICK_PROMPTS = [
  "这部电影开头怎么写？",
  "怎么提升完播率？",
  "悬念式开场咋操作？",
  "结尾升华的套路说一个",
];

export function TalkFenggeView() {
  const { user, setView } = useAppStore();

  const [messages, setMessages] = React.useState<FenggeMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [remainingGuestTurns, setRemainingGuestTurns] = React.useState<
    number | null
  >(null);
  const [asrConfig, setAsrConfig] = React.useState<AsrConfigResp | null>(null);
  const [asrLoading, setAsrLoading] = React.useState(false);
  const [asrPartial, setAsrPartial] = React.useState("");
  const [needLogin, setNeedLogin] = React.useState(false);
  const [historyLoaded, setHistoryLoaded] = React.useState(false);

  const recorder = useFenggeRecorder();

  // 每条荒哥回复的朗读音频 url：messageId -> url
  const audioUrlsRef = React.useRef<Map<string, string>>(new Map());
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [ttsLoadingId, setTtsLoadingId] = React.useState<string | null>(null);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // 是否游客 = 无登录用户
  const isGuest = !user;

  // 拉取讯飞 ASR 配置（决定麦克风是否可用）
  React.useEffect(() => {
    fetch("/api/ai/asr-config")
      .then((r) => r.json())
      .then((d: AsrConfigResp) => setAsrConfig(d))
      .catch(() =>
        setAsrConfig({ configured: false, appId: "", apiKey: "", apiSecret: "" })
      );
  }, []);

  // 登录用户：拉历史
  React.useEffect(() => {
    if (isGuest) {
      setHistoryLoaded(true);
      setMessages([
        {
          id: "intro",
          role: "assistant",
          content:
            "嘛，来了啊。我是荒哥，专门聊电影解说创作的——开头咋写、剧情咋接、结尾咋升华，都行。没登录也能先聊几句试试水，写下你的问题就行。",
        },
      ]);
      return;
    }
    setHistoryLoaded(false);
    fetch("/api/ai/fengge-chat")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.messages)) {
          setMessages(
            d.messages.map(
              (m: { id: string; role: string; content: string; createdAt?: string }) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
                createdAt: m.createdAt,
              })
            )
          );
          if (d.sessionId) setSessionId(d.sessionId);
        }
      })
      .catch(() => {})
      .finally(() => {
        setHistoryLoaded(true);
      });
  }, [isGuest]);

  // 自动滚到底
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, asrPartial]);

  // 卸载清理音频 url
  React.useEffect(() => {
    const map = audioUrlsRef.current;
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url));
      map.clear();
    };
  }, []);

  const sendChat = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setNeedLogin(false);
    const userMsg: FenggeMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const optimistic = [...messages, userMsg];
    setMessages(optimistic);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai/fengge-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          history: optimistic
            .filter((m) => m.id !== "intro")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.needLogin) {
          setNeedLogin(true);
          setRemainingGuestTurns(0);
          return;
        }
        throw new Error(data?.error || "荒哥暂时没法回话");
      }
      const aiMsg: FenggeMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: data.answer,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.sessionId) setSessionId(data.sessionId);
      if (typeof data.remainingGuestTurns === "number") {
        setRemainingGuestTurns(data.remainingGuestTurns);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat(input);
    }
  };

  // 朗读荒哥回复
  const stopPlay = React.useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const playUrl = (url: string, msgId: string) => {
    const audio = new Audio(url);
    audioElRef.current = audio;
    audio.onplay = () => setPlayingId(msgId);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      toast.error("播放失败");
    };
    audio.play().catch(() => setPlayingId(null));
  };

  const speak = async (msgId: string, text: string) => {
    // 已在播该条 → 停止
    if (playingId === msgId) {
      stopPlay();
      return;
    }
    // 切换到别的条目 → 先停当前
    if (playingId) stopPlay();
    // 已缓存音频则直接播
    const cached = audioUrlsRef.current.get(msgId);
    if (cached) {
      playUrl(cached, msgId);
      return;
    }
    setTtsLoadingId(msgId);
    try {
      const res = await fetch("/api/ai/fengge-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          d.error ||
            (res.status === 429
              ? "语音当前过于频繁或额度受限，稍等一下再试"
              : "语音合成失败")
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioUrlsRef.current.set(msgId, url);
      playUrl(url, msgId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "语音合成失败");
    } finally {
      setTtsLoadingId(null);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success("已复制"),
      () => toast.error("复制失败")
    );
  };

  const clearHistory = async () => {
    if (isGuest) {
      setMessages([
        {
          id: "intro",
          role: "assistant",
          content: "嘛，重新开始。写下你的问题就行。",
        },
      ]);
      setNeedLogin(false);
      setRemainingGuestTurns(null);
      return;
    }
    if (!sessionId) {
      setMessages([]);
      return;
    }
    try {
      await fetch(
        `/api/ai/fengge-chat?sessionId=${encodeURIComponent(sessionId)}`,
        { method: "DELETE" }
      );
      setMessages([]);
      setSessionId(null);
      toast.success("已清空对话");
    } catch {
      toast.error("清空失败");
    }
  };

  // —— 语音输入 ——
  const micEnabled = !!asrConfig?.configured && recorder.isSupported;

  const handleMicStart = async () => {
    if (!asrConfig?.configured) {
      toast.error("管理员尚未配置讯飞语音识别，文字输入也可以聊");
      return;
    }
    if (!recorder.isSupported) {
      toast.error("当前浏览器不支持录音");
      return;
    }
    if (needLogin) {
      toast.error("游客额度已用完，登录后可继续语音对话");
      return;
    }
    stopPlay();
    setAsrPartial("");
    await recorder.start();
  };

  const handleMicStop = async () => {
    if (!recorder.isRecording) return;
    setAsrLoading(true);
    setAsrPartial("识别中…");
    const blob = await recorder.stop();
    if (!blob || blob.size === 0) {
      setAsrLoading(false);
      setAsrPartial("");
      return;
    }
    try {
      const text = await recognizeAudio(
        blob,
        {
          appId: asrConfig!.appId,
          apiKey: asrConfig!.apiKey,
          apiSecret: asrConfig!.apiSecret,
        } as XfyunAsrConfig,
        {
          onStatus: () => {},
          onProgress: () => {},
          onPartialText: (t) => setAsrPartial(t || "识别中…"),
        }
      );
      const recognized = text.trim();
      if (!recognized) {
        toast.error("没听清，再说一遍试试");
      } else {
        setAsrPartial("");
        await sendChat(recognized);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "识别失败");
    } finally {
      setAsrLoading(false);
      setAsrPartial("");
    }
  };

  const micButton = (
    <button
      type="button"
      disabled={!micEnabled || sending || asrLoading || needLogin}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!recorder.isRecording) handleMicStart();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        if (recorder.isRecording) handleMicStop();
      }}
      onPointerLeave={() => {
        if (recorder.isRecording) handleMicStop();
      }}
      title={
        !asrConfig?.configured
          ? "管理员未配置讯飞语音识别"
          : !recorder.isSupported
            ? "浏览器不支持录音"
            : "按住说话"
      }
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border transition-all",
        recorder.isRecording
          ? "border-rose-500 bg-rose-500 text-white shadow-[0_0_22px_rgba(244,63,94,0.4)]"
          : "border-border/70 bg-card/60 text-foreground hover:border-primary/40",
        (!micEnabled || sending || asrLoading || needLogin) &&
          "cursor-not-allowed opacity-50"
      )}
    >
      {recorder.isRecording ? (
        <span className="absolute inset-0 animate-ping rounded-[2px] bg-rose-500/30" />
      ) : null}
      {asrLoading ? (
        <Loader2 className="relative h-4 w-4 animate-spin" />
      ) : recorder.isRecording ? (
        <Square className="relative h-4 w-4" style={{ fill: "currentColor" }} />
      ) : (
        <Mic className="relative h-4 w-4" />
      )}
    </button>
  );

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col">
      {/* 顶部状态条 */}
      <div className="container-page pt-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[2px] border border-border/70 bg-gradient-to-br from-amber-500/15 to-rose-500/15">
              <BrandIcon size="sm" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                / talk · 和荒哥聊聊
              </div>
              <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight">
                和荒哥聊聊
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isGuest ? (
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:inline">
                访客模式
              </span>
            ) : (
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:inline">
                已登录 · {user?.name}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="h-8 rounded-[2px] font-mono text-[10px] uppercase tracking-[0.06em]"
              title="清空当前对话"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              重开
            </Button>
          </div>
        </div>
      </div>

      {/* 对话区 */}
      <div
        ref={scrollRef}
        className="container-page flex-1 overflow-y-auto py-6"
        style={{ minHeight: 200 }}
      >
        {historyLoaded ? (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((m) =>
              m.role === "assistant" ? (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-border/70 bg-card/70">
                    <BrandIcon size="sm" />
                  </div>
                  <div className="flex-1">
                    <div className="rounded-[2px] border border-border/60 bg-card/70 px-4 py-3 text-[14px] leading-relaxed">
                      {renderMarkdownish(m.content)}
                    </div>
                    {m.id !== "intro" && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <button
                          onClick={() => speak(m.id, m.content)}
                          disabled={!!ttsLoadingId && ttsLoadingId !== m.id}
                          className="inline-flex items-center gap-1 rounded-[2px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                          title={playingId === m.id ? "停止播放" : "朗读"}
                        >
                          {ttsLoadingId === m.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : playingId === m.id ? (
                            <Square className="h-3 w-3" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                          {ttsLoadingId === m.id
                            ? "合成中"
                            : playingId === m.id
                              ? "停止"
                              : "朗读"}
                        </button>
                        <button
                          onClick={() => copyText(m.content)}
                          className="inline-flex items-center gap-1 rounded-[2px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:text-foreground"
                          title="复制"
                        >
                          <Copy className="h-3 w-3" />
                          复制
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start justify-end gap-3">
                  <div className="max-w-[80%] rounded-[2px] border border-primary/30 bg-primary/8 px-4 py-3 text-[14px] leading-relaxed">
                    {m.content}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-border/60 bg-primary/10 text-[11px] font-semibold text-primary">
                    {user?.name?.slice(0, 1) || "我"}
                  </div>
                </div>
              )
            )}

            {sending && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-border/70 bg-card/70">
                  <BrandIcon size="sm" />
                </div>
                <div className="rounded-[2px] border border-border/60 bg-card/70 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    荒哥琢磨中…
                  </span>
                </div>
              </div>
            )}

            {asrLoading && asrPartial && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-border/70 bg-card/70">
                  <BrandIcon size="sm" />
                </div>
                <div className="rounded-[2px] border border-dashed border-border/60 bg-card/40 px-4 py-3 text-[13px] text-muted-foreground">
                  {asrPartial}
                </div>
              </div>
            )}

            {/* 游客额度提示 */}
            {isGuest &&
              remainingGuestTurns !== null &&
              remainingGuestTurns <= 3 &&
              !needLogin && (
                <div className="rounded-[2px] border border-amber-300/30 bg-amber-500/8 px-4 py-2 text-center text-[12px] text-amber-700 dark:text-amber-300">
                  访客还可聊 {remainingGuestTurns} 轮，登录后继续
                </div>
              )}

            {/* 游客到上限 */}
            {needLogin && (
              <div className="rounded-[2px] border border-primary/40 bg-primary/8 px-5 py-6 text-center">
                <p className="text-[14px] text-foreground">
                  访客体验额度已用完，登录后继续和荒哥聊。
                </p>
                <Button
                  onClick={() => setView("auth")}
                  className="mt-3 h-9 rounded-[2px]"
                >
                  <LogIn className="mr-1.5 h-4 w-4" />
                  登录 / 注册
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[40vh] items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="sticky bottom-0 border-t border-border/60 bg-background/85 backdrop-blur-md">
        <div className="container-page py-4">
          {/* 快捷提示（仅空对话且未到上限时显示） */}
          {messages.length <= 1 && !needLogin && (
            <div className="mx-auto mb-3 flex max-w-3xl flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendChat(p)}
                  disabled={sending}
                  className="rounded-[2px] border border-border/70 bg-card/50 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  needLogin
                    ? "登录后继续聊天 →"
                    : "写下你的问题，回车发送（Shift+回车换行）…"
                }
                disabled={sending || needLogin}
                className="min-h-[40px] max-h-32 resize-none rounded-[2px] border-border/70 bg-card/60 text-[14px]"
                rows={1}
              />
            </div>
            {micButton}
            <Button
              onClick={() => sendChat(input)}
              disabled={!input.trim() || sending || needLogin}
              className="h-10 rounded-[2px] px-4"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground/70">
            <span>
              {asrConfig?.configured
                ? recorder.isSupported
                  ? "按住麦克风说话"
                  : "浏览器不支持录音"
                : "文字对话可用 · 语音需管理员配置"}
            </span>
            {recorder.error && (
              <span className="text-rose-500">{recorder.error}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 轻量 markdown 渲染：保留换行、加粗、行内代码。避免额外依赖。 */
function renderMarkdownish(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = re.exec(line)) !== null) {
      if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
      const token = match[0];
      if (token.startsWith("**")) {
        parts.push(
          <strong key={idx++} className="font-semibold text-foreground">
            {token.slice(2, -2)}
          </strong>
        );
      } else {
        parts.push(
          <code
            key={idx++}
            className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[12px]"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < line.length) parts.push(line.slice(lastIndex));
    return (
      <React.Fragment key={i}>
        {parts.length ? parts : line}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}