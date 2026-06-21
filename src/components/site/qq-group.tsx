"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { QQ_GROUP } from "@/lib/qq-group";

/**
 * 直播加群引导组件（全局挂载，右下角 + 弹窗）。
 *
 * 三态交互：
 * - 新用户进站（未点过加群）→ 延迟自动弹出醒目加群弹窗
 * - 点击「一键跳转加群」/关闭 → 弹窗缩小飞向右下角，变成可点开的小浮窗，并记住状态
 * - 老用户（已点过加群）进站 → 不自动弹，直接显示右下角小浮窗
 */
export function QQGroupFab() {
  const qqGroupJoined = useAppStore((s) => s.qqGroupJoined);
  const markQqGroupJoined = useAppStore((s) => s.markQqGroupJoined);

  // popupOpen：弹窗展开；collapsed：显示右下角小浮窗
  // sessionDismissed：本次会话内手动关过弹窗（防同会话反复自动弹，但不持久化）
  const [popupOpen, setPopupOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [sessionDismissed, setSessionDismissed] = React.useState(false);
  // 进入页面 1.5s 后展示小浮窗气泡提示，5s 后自动隐藏
  const [bubble, setBubble] = React.useState(false);

  // 首屏挂载：决定自动弹还是直接收成小浮窗
  React.useEffect(() => {
    if (qqGroupJoined || sessionDismissed) {
      // 已加群或本次会话关过 → 直接小浮窗，不弹
      setCollapsed(true);
      return;
    }
    // 新用户 → 延迟自动弹出，避免和首屏渲染抢焦点
    const t = window.setTimeout(() => setPopupOpen(true), 1500);
    return () => window.clearTimeout(t);
    // 仅在挂载时按初始 joined 状态决策一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 小浮窗气泡提示
  React.useEffect(() => {
    if (!collapsed) return;
    const t1 = window.setTimeout(() => setBubble(true), 400);
    const t2 = window.setTimeout(() => setBubble(false), 5400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [collapsed]);

  // Esc 关闭弹窗（同 X 按钮：缩小不标记 joined）
  React.useEffect(() => {
    if (!popupOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popupOpen]);

  // 弹窗打开时锁定背景滚动
  React.useEffect(() => {
    if (popupOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [popupOpen]);

  /** 关闭弹窗 → 缩小成小浮窗（不标记 joined，本次会话不再自动弹） */
  const handleDismiss = React.useCallback(() => {
    setPopupOpen(false);
    setSessionDismissed(true);
    // 延迟显示小浮窗，等弹窗缩小动画跑一会儿再长出来，视觉衔接更自然
    window.setTimeout(() => setCollapsed(true), 150);
  }, []);

  /** 点击一键加群 → 打开 QQ 加群页 + 标记 joined + 缩小成小浮窗 */
  const handleJoin = React.useCallback(() => {
    window.open(QQ_GROUP.joinUrl, "_blank", "noopener,noreferrer");
    markQqGroupJoined();
    setPopupOpen(false);
    window.setTimeout(() => setCollapsed(true), 150);
  }, [markQqGroupJoined]);

  /** 点小浮窗 → 重新展开弹窗 */
  const handleExpand = React.useCallback(() => {
    setCollapsed(false);
    setBubble(false);
    setPopupOpen(true);
  }, []);

  return (
    <>
      {/* 右下角小浮窗（collapsed 态） */}
      <AnimatePresence>
        {collapsed && !popupOpen && (
          <motion.div
            key="qq-fab"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
          >
            {/* 提示气泡 */}
            {bubble && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button
                  type="button"
                  onClick={() => setBubble(false)}
                  aria-label="关闭提示"
                  className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
                <div
                  onClick={handleExpand}
                  className="cursor-pointer rounded-2xl rounded-br-sm border border-primary/30 bg-gradient-to-br from-primary to-accent px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow-primary"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    点这里加群
                  </div>
                  <div className="mt-0.5 text-[11px] font-normal opacity-90">
                    免费实战答疑 · 同行交流
                  </div>
                </div>
              </div>
            )}

            {/* 浮动按钮 */}
            <button
              type="button"
              onClick={handleExpand}
              aria-label="加入 QQ 群"
              className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow-primary transition-transform duration-200 hover:scale-110 active:scale-95 sm:h-16 sm:w-16"
            >
              {/* 多层脉冲光圈 */}
              <span className="absolute inset-0 -z-10 rounded-full bg-primary/40 animate-ping" />
              <span
                className="absolute inset-0 -z-10 rounded-full bg-accent/30 animate-ping"
                style={{ animationDelay: "0.6s" }}
              />
              <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.4} />
              {/* 红点提醒 */}
              <span className="absolute right-0 top-0 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 ring-2 ring-background" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 加群弹窗（自建 framer-motion，缩小飞向右下角） */}
      <AnimatePresence>
        {popupOpen && (
          <QQGroupPopup
            onJoin={handleJoin}
            onClose={handleDismiss}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * 醒目的直播加群弹窗。自建 framer-motion 而非 radix Dialog，
 * 以便精确控制「缩小飞向右下角」的退出动画。
 */
function QQGroupPopup({
  onJoin,
  onClose,
}: {
  onJoin: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [hasQR, setHasQR] = React.useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(QQ_GROUP.number);
      setCopied(true);
      toast.success("群号已复制到剪贴板");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <>
      {/* 遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      />

      {/* 卡片：用 inset-0 m-auto 居中，腾出 transform 通道给缩小动画 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.25, x: "42vw", y: "42vh" }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-50 m-auto flex h-fit w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-soft-lg"
      >
        {/* 顶部渐变标头 */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-accent px-6 pt-7 pb-6 text-primary-foreground">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
          </div>

          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-primary-foreground backdrop-blur transition-colors hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative">
            {/* 直播中徽标 */}
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1 text-[11px] font-semibold text-white">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-90" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              LIVE · 直播专属
            </div>

            <h2 className="text-2xl font-bold text-primary-foreground">
              加入官方 QQ 学习群
            </h2>
            <p className="mt-1.5 text-sm text-primary-foreground/85">
              {QQ_GROUP.tagline}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-primary-foreground/90">
              <Users className="h-3.5 w-3.5" />
              <span>{QQ_GROUP.name}</span>
            </div>
          </div>
        </div>

        {/* 主体 */}
        <div className="space-y-5 px-6 pt-5 pb-6">
          {/* 群号 + 复制 */}
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              QQ 群号
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 pl-4">
              <span className="flex-1 font-mono text-2xl font-bold tracking-wider tabular-nums">
                {QQ_GROUP.number}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      已复制
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    复制
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 二维码（图片不存在则隐藏） */}
          {hasQR && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4">
              <img
                src={QQ_GROUP.qrcode}
                alt="QQ 群二维码"
                onError={() => setHasQR(false)}
                className="h-40 w-40 rounded-lg bg-white object-contain p-2"
              />
              <div className="text-xs text-muted-foreground">
                手机 QQ 扫一扫 · 直接加群
              </div>
            </div>
          )}

          {/* 主操作：脉冲光晕 + 渐变 */}
          <Button
            size="lg"
            onClick={onJoin}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-accent text-base font-semibold text-primary-foreground shadow-glow-primary animate-pulse-soft hover:opacity-95"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            一键跳转加群
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            点击上方按钮将打开 QQ 加群页面
            <br />
            未安装 QQ 时，会自动跳转网页版加群
          </p>
        </div>
      </motion.div>
    </>
  );
}

/**
 * 仅按钮 + 弹窗，可放置在 Header / 任意位置触发。
 */
export function QQGroupButton({
  className,
  variant = "default",
  size = "sm",
  showLabel = true,
}: {
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg" | "icon";
  showLabel?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            variant === "default" &&
              "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm hover:opacity-90",
            "gap-1.5",
            className
          )}
        >
          <MessageCircle className="h-4 w-4" />
          {showLabel && <span>加 QQ 群</span>}
        </Button>
      </DialogTrigger>
      <QQGroupDialogContent />
    </Dialog>
  );
}

/**
 * 加群对话框内容，复用于 FAB 与按钮触发两种场景。
 */
function QQGroupDialogContent() {
  const [copied, setCopied] = React.useState(false);
  const [hasQR, setHasQR] = React.useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(QQ_GROUP.number);
      setCopied(true);
      toast.success("群号已复制到剪贴板");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  const handleJoin = () => {
    window.open(QQ_GROUP.joinUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <DialogContent className="overflow-hidden p-0 sm:max-w-md">
      {/* 顶部渐变标头 */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-accent px-6 pt-7 pb-6 text-primary-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
            <Sparkles className="h-3 w-3" />
            直播学员专属
          </div>
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-2xl font-bold text-primary-foreground">
              加入官方 QQ 学习群
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/85">
              {QQ_GROUP.tagline}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-primary-foreground/90">
            <Users className="h-3.5 w-3.5" />
            <span>{QQ_GROUP.name}</span>
          </div>
        </div>
      </div>

      {/* 主体 */}
      <div className="space-y-5 px-6 pt-5 pb-6">
        {/* 群号 + 复制 */}
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            QQ 群号
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 pl-4">
            <span className="flex-1 font-mono text-xl font-bold tracking-wider tabular-nums">
              {QQ_GROUP.number}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    已复制
                  </span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  复制
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 二维码（图片不存在则隐藏） */}
        {hasQR && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4">
            { }
            <img
              src={QQ_GROUP.qrcode}
              alt="QQ 群二维码"
              onError={() => setHasQR(false)}
              className="h-40 w-40 rounded-lg bg-white object-contain p-2"
            />
            <div className="text-xs text-muted-foreground">
              手机 QQ 扫一扫 · 直接加群
            </div>
          </div>
        )}

        {/* 主操作 */}
        <Button
          size="lg"
          onClick={handleJoin}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-accent text-base font-semibold text-primary-foreground shadow-glow-primary hover:opacity-95"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          一键跳转加群
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          点击上方按钮将打开 QQ 加群页面
          <br />
          未安装 QQ 时，会自动跳转网页版加群
        </p>
      </div>
    </DialogContent>
  );
}
