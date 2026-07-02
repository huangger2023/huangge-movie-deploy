"use client";

/**
 * 像素风工具卡片预览组件
 * 复古8-bit游戏风格
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Type, Zap, Wand2, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";

const PIXEL_COLORS = {
  amber: { from: "#f59e0b", to: "#ea580c" },
  fuchsia: { from: "#d946ef", to: "#f43f5e" },
  emerald: { from: "#10b981", to: "#14b8a6" },
  rose: { from: "#f43f5e", to: "#ec4899" },
};

const PIXEL_TOOLS = [
  {
    id: "title",
    name: "爆款标题生成器",
    short: "爆款标题",
    desc: "六大爆款公式批量产出悬念/反差/数字型标题",
    icon: Type,
    color: PIXEL_COLORS.amber,
    pixelArt: "◼◼◼◼◼◼◼\n◼▫▫▫▫▫◼\n◼▫◼◼◼▫◼\n◼▫◼▫▫▫◼\n◼▫▫▫▫▫◼\n◼◼◼◼◼◼◼",
  },
  {
    id: "hook",
    name: "黄金3秒开头",
    short: "黄金开头",
    desc: "5种钩子类型，一句话把观众钉在屏幕上",
    icon: Zap,
    color: PIXEL_COLORS.fuchsia,
    pixelArt: "◼◼◼⚡◼◼◼\n◼◼⚡◼⚡◼◼\n⚡⚡⚡⚡⚡⚡⚡\n◼◼⚡◼⚡◼◼\n◼◼◼⚡◼◼◼",
  },
  {
    id: "polish",
    name: "文案润色神器",
    short: "文案润色",
    desc: "增强转折词、画面感、情绪张力",
    icon: Wand2,
    color: PIXEL_COLORS.emerald,
    pixelArt: "◼◼◼◼◼◼◼\n◼🪄◼◼◼◼◼\n◼◼◼◼◼◼◼\n◼◼✨✨✨◼◼\n◼◼◼◼◼◼◼",
  },
  {
    id: "tts",
    name: "语音试听",
    short: "语音试听",
    desc: "7种声线即时合成，挑出最适合你账号的音色",
    icon: Mic,
    color: PIXEL_COLORS.rose,
    pixelArt: "◼◼◼◼◼◼◼\n◼◼🎤◼◼◼\n◼🎤🎤🎤🎤◼\n🎤◼◼◼◼🎤\n◼◼🎤🎤🎤◼\n◼◼◼◼◼◼◼",
  },
] as const;

export function PixelToolsPreview() {
  const selectedTool = useAppStore((s) => s.selectedTool);
  const selectTool = useAppStore((s) => s.selectTool);
  const [activeTab, setActiveTab] = React.useState("title");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    selectTool(value);
  };

  return (
    <div className="relative min-h-[400px] bg-[#1a1a2e] p-6">
      {/* Pixel grid background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(#fff 1px, transparent 1px),
            linear-gradient(90deg, #fff 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px'
        }}
      />
      
      {/* Scanline effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
        }}
      />

      <div className="relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 inline-block border-4 border-r-4 border-b-4 border-l-0 border-t-0 border-r-cyan-400 border-b-cyan-400 bg-[#0f0f23] px-4 py-2">
            <h1 className="text-2xl font-bold tracking-wider text-[#00ffff] [text-shadow:2px_2px_0_#ff00ff]">
              ▸ 创作工具箱 ◂
            </h1>
          </div>
          <p className="font-mono text-sm text-[#00ff00]">
            ══ SELECT YOUR WEAPON ══
          </p>
        </motion.div>

        {/* Tool Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PIXEL_TOOLS.map((tool, i) => {
            const isActive = activeTab === tool.id;
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <button
                  onClick={() => handleTabChange(tool.id)}
                  className={cn(
                    "group relative w-full text-left transition-transform",
                    isActive ? "translate-y-[-4px]" : "hover:translate-y-[-2px]"
                  )}
                >
                  {/* Pixel border effect */}
                  <div 
                    className="absolute inset-0 border-4"
                    style={{
                      borderColor: isActive ? "#ffff00" : "#333",
                      boxShadow: isActive 
                        ? "4px 4px 0 #ffff00, -4px -4px 0 #ff00ff" 
                        : "4px 4px 0 #333"
                    }}
                  />
                  
                  {/* Main card */}
                  <div
                    className={cn(
                      "border-4 border-l-0 border-t-0",
                      isActive 
                        ? "border-r-[#ffff00] border-b-[#ffff00] bg-[#2a2a4e]" 
                        : "border-r-[#444] border-b-[#444] bg-[#1f1f3e] hover:bg-[#2a2a4e]"
                    )}
                    style={{ borderStyle: 'outset' }}
                  >
                    {/* Icon area */}
                    <div 
                      className="flex items-center justify-center py-4"
                      style={{
                        background: isActive 
                          ? `linear-gradient(180deg, ${tool.color.from} 0%, ${tool.color.to} 100%)` 
                          : '#1a1a2e'
                      }}
                    >
                      <tool.icon 
                        className="h-8 w-8" 
                        style={{ 
                          color: isActive ? '#fff' : '#666',
                          filter: isActive ? 'drop-shadow(2px 2px 0 #000)' : 'none'
                        }} 
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="p-3">
                      <h3 
                        className={cn(
                          "mb-1 font-mono text-sm font-bold tracking-wider",
                          isActive ? "text-[#ffff00]" : "text-[#aaa]"
                        )}
                      >
                        ▸ {tool.name}
                      </h3>
                      <p className="mb-2 font-mono text-[10px] text-[#888]">
                        {tool.desc}
                      </p>
                      
                      {/* Pixel indicator */}
                      <div className="flex items-center gap-1">
                        <span 
                          className="font-mono text-xs"
                          style={{ color: isActive ? '#00ff00' : '#444' }}
                        >
                          {isActive ? "► PLAYING" : "○ SELECT"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom status bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex items-center justify-between border-4 border-[#333] bg-[#0f0f23] p-2"
          style={{ borderStyle: 'inset' }}
        >
          <span className="font-mono text-xs text-[#00ffff]">
            ◆ MODE: {PIXEL_TOOLS.find(t => t.id === activeTab)?.name.toUpperCase()}
          </span>
          <span className="font-mono text-xs text-[#ff00ff]">
            HP ████████████ 100%
          </span>
        </motion.div>
      </div>
    </div>
  );
}

// Helper for cn
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
