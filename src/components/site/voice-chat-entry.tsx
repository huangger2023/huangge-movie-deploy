"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function VoiceChatEntry() {
  const { setView } = useAppStore();
  const [hovered, setHovered] = React.useState(false);
  const [clicked, setClicked] = React.useState(false);

  const handleClick = () => {
    setClicked(true);
    // 创建涟漪效果
    setTimeout(() => setClicked(false), 600);
    setView("talk-fengge");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "group relative flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300",
          hovered && !clicked
            ? "border-rose-500/50 bg-rose-500/15 scale-110"
            : "border-border/60 bg-card/80"
        )}
        style={{
          boxShadow: hovered
            ? "0 0 30px rgba(220,38,38,0.25), 0 8px 32px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {/* 点击涟漪效果 */}
        <AnimatePresence>
          {clicked && (
            <>
              <motion.div
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-2 border-rose-400"
              />
              <motion.div
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                className="absolute inset-0 rounded-full bg-rose-500/30"
              />
            </>
          )}
        </AnimatePresence>

        {/* 麦克风图标 */}
        <motion.svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={hovered ? "#f87171" : "#a1a1aa"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "h-6 w-6 transition-all duration-300",
            hovered && !clicked && "drop-shadow-[0_0_6px_rgba(248,113,113,0.5)]"
          )}
          animate={clicked ? { scale: [1, 0.8, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </motion.svg>

        {/* 悬浮提示 */}
        <div
          className={cn(
            "pointer-events-none absolute right-full mr-3 flex items-center gap-2 whitespace-nowrap rounded border border-border/60 bg-card/95 px-3 py-1.5 font-mono text-[11px] text-muted-foreground backdrop-blur-sm transition-all duration-200",
            hovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
          )}
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          和荒哥聊聊
        </div>
      </motion.button>
    </div>
  );
}