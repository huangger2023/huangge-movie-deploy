"use client";

import * as React from "react";
import { useAppStore } from "@/lib/store";

// Load Press Start 2P + VT323 fonts
if (typeof document !== "undefined" && !document.getElementById("pixel-fonts")) {
  const link = document.createElement("link");
  link.id = "pixel-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap";
  document.head.appendChild(link);
}

// ─── Pixel Button ──────────────────────────────────────────────────────

function PixelButton({
  children,
  onClick,
  color = "brown",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: "brown" | "amber" | "green" | "red" | "cream";
}) {
  const colors = {
    brown:  { bg: "bg-[#8B4513]", fg: "text-[#F5E6C8]", border: "border-[#5A3A1E]", shadow: "shadow-[4px_4px_0_0_#5A3A1E]" },
    amber:  { bg: "bg-[#D4A76A]", fg: "text-[#5A3A1E]", border: "border-[#8B5E3C]", shadow: "shadow-[4px_4px_0_0_#8B5E3C]" },
    green:  { bg: "bg-[#6B8E23]", fg: "text-[#F5E6C8]", border: "border-[#4A6B18]", shadow: "shadow-[4px_4px_0_0_#4A6B18]" },
    red:    { bg: "bg-[#DC143C]", fg: "text-[#F5E6C8]", border: "border-[#8B0000]", shadow: "shadow-[4px_4px_0_0_#8B0000]" },
    cream:  { bg: "bg-[#F5E6C8]", fg: "text-[#5A3A1E]", border: "border-[#8B5E3C]", shadow: "shadow-[4px_4px_0_0_#8B5E3C]" },
  };
  const c = colors[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${c.bg} ${c.fg} ${c.border} ${c.shadow}
        border-2 font-bold transition-all active:translate-x-1 active:translate-y-1 active:shadow-none
        px-5 py-2`}
      style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px", letterSpacing: "0.5px" }}
    >
      {children}
    </button>
  );
}

// ─── Pixel Card ──────────────────────────────────────────────────────────────────────────

function PixelCard({
  children,
  title,
  number,
}: {
  children: React.ReactNode;
  title: string;
  number?: number;
}) {
  return (
    <div className="bg-[#FBF1DC] border-2 border-[#8B5E3C] shadow-[6px_6px_0_0_#8B5E3C] p-4 relative">
      {number && (
        <div
          className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center bg-[#D4A76A] border-2 border-[#8B5E3C] text-[#5A3A1E]"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px" }}
        >
          {number}
        </div>
      )}
      {title && (
        <div
          className="text-[#8B5E3C] font-bold mb-3 pb-2 border-b-2 border-[#D4A76A]"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px", letterSpacing: "0.5px" }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Pixel Chord Tag ───────────────────────────────────────────────────

const chordColors: Record<string, string> = {
  C: "bg-[#6B8E23]", G: "bg-[#4A8BCA]", Am: "bg-[#E87722]",
  F: "bg-[#A855F7]", Dm: "bg-[#DC143C]", Em: "bg-[#DC143C]",
};

function ChordTag({ name }: { name: string }) {
  return (
    <span
      className={`${chordColors[name] || "bg-[#8B5E3C]"} text-[#F5E6C8] px-2 py-1 border border-[#5A3A1E]`}
      style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}
    >
      {name}
    </span>
  );
}

// ─── Pixel Timeline ─────────────────────────────────────────────────────

const structureSegments = [
  { label: "Intro", start: 0, end: 0.3 },
  { label: "Verse", start: 0.3, end: 1.2 },
  { label: "Chorus", start: 1.2, end: 2.0 },
  { label: "Bridge", start: 2.0, end: 2.4 },
  { label: "Outro", start: 2.4, end: 3.2 },
];

const structureColors: Record<string, string> = {
  Intro: "bg-[#6B8E23]", Verse: "bg-[#4A8BCA]", Chorus: "bg-[#E87722]",
  Bridge: "bg-[#A855F7]", Outro: "bg-[#DC143C]",
};

function PixelTimeline() {
  const total = 3.2;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex">
        {structureSegments.map((seg) => (
          <div
            key={seg.label}
            className={`${structureColors[seg.label]} h-6 border-2 border-[#5A3A1E] flex items-center justify-center text-[#F5E6C8]`}
            style={{ width: `${((seg.end - seg.start) / total) * 100}%`, fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}
          >
            {seg.label}
          </div>
        ))}
      </div>
      <div className="flex text-[#8B5E3C]" style={{ fontFamily: "'VT323', monospace", fontSize: "12px" }}>
        {structureSegments.map((seg) => (
          <div key={seg.label} style={{ width: `${((seg.end - seg.start) / total) * 100}%` }} className="flex justify-start px-1">
            {Math.floor(seg.start)}:{String(Math.round((seg.start % 1) * 60)).padStart(2, "0")}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pixel Chord Sheet ───────────────────────────────────────────────────

const chordSheet: Record<string, string[]> = {
  Intro:  ["C", "G", "Am", "F"],
  Verse:  ["C", "G", "Am", "F"],
  Chorus: ["F", "G", "Em", "Am"],
  Bridge: ["Dm", "G", "C", "G"],
  Outro:  ["C", "G", "Am", "G"],
};

function PixelChordSheet() {
  return (
    <div className="font-mono">
      {Object.entries(chordSheet).map(([section, chords]) => (
        <div key={section} className="flex items-center gap-2 py-1 border-b border-[#D4A76A]">
          <span
            className="text-[#8B5E3C] w-14"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "7px" }}
          >
            {section}
          </span>
          <div className="flex gap-1">
            {chords.map((c) => <ChordTag key={c} name={c} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pixel Audio Player ──────────────────────────────────────────────────

function PixelAudioPlayer() {
  const [playing, setPlaying] = React.useState(false);
  return (
    <div className="bg-[#FBF1DC] border-2 border-[#8B5E3C] shadow-[4px_4px_0_0_#8B5E3C] p-3">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          className="w-8 h-8 bg-[#6B8E23] border-2 border-[#4A6B18] flex items-center justify-center text-[#F5E6C8]"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px" }}
        >
          {playing ? "||" : "▶"}
        </button>
        <div className="flex-1">
          <PixelWaveformSVG />
        </div>
      </div>
      <div className="flex justify-between text-[#8B5E3C]" style={{ fontFamily: "'VT323', monospace", fontSize: "14px" }}>
        <span>{playing ? "00:07" : "00:00"}</span>
        <span>03:45</span>
      </div>
    </div>
  );
}

// ─── Pixel Waveform SVG ─────────────────────────────────────────────────

function PixelWaveformSVG() {
  const bars = 32;
  return (
    <svg viewBox="0 0 128 16" width="100%" height="32" shapeRendering="crispEdges">
      {Array.from({ length: bars }).map((_, i) => {
        const h = 3 + Math.abs(Math.sin(i * 0.7) * 5) + Math.abs(Math.cos(i * 0.4) * 3);
        return <rect key={i} x={i * 4} y={8 - h} width={2} height={h * 2} fill="#6B8E23" />;
      })}
    </svg>
  );
}

// ─── Pixel SVG Icons ───────────────────────────────────────────────────

const PixelNote = () => (
  <svg viewBox="0 0 16 16" width={32} height={32} shapeRendering="crispEdges">
    <rect x="6" y="2" width="2" height="9" fill="#8B4513"/>
    <rect x="4" y="3" width="2" height="8" fill="#8B4513"/>
    <rect x="8" y="3" width="4" height="3" fill="#8B4513"/>
    <rect x="6" y="11" width="6" height="2" fill="#8B4513"/>
    <rect x="6" y="13" width="6" height="1" fill="#8B4513"/>
  </svg>
);

const PixelStar = () => (
  <svg viewBox="0 0 16 16" width={32} height={32} shapeRendering="crispEdges">
    <rect x="5" y="1" width="2" height="2" fill="#FFD700"/>
    <rect x="3" y="3" width="4" height="2" fill="#FFD700"/>
    <rect x="2" y="5" width="2" height="2" fill="#FFD700"/>
    <rect x="10" y="5" width="2" height="2" fill="#FFD700"/>
    <rect x="3" y="6" width="8" height="2" fill="#FFD700"/>
    <rect x="2" y="8" width="3" height="2" fill="#FFD700"/>
    <rect x="10" y="8" width="3" height="2" fill="#FFD700"/>
    <rect x="3" y="10" width="8" height="2" fill="#FFD700"/>
    <rect x="5" y="12" width="4" height="2" fill="#FFD700"/>
    <rect x="6" y="14" width="2" height="2" fill="#FFD700"/>
  </svg>
);

const PixelHeart = () => (
  <svg viewBox="0 0 16 16" width={32} height={32} shapeRendering="crispEdges">
    <rect x="3" y="2" width="2" height="2" fill="#DC143C"/>
    <rect x="6" y="2" width="2" height="2" fill="#DC143C"/>
    <rect x="2" y="3" width="8" height="2" fill="#DC143C"/>
    <rect x="2" y="5" width="2" height="2" fill="#DC143C"/>
    <rect x="8" y="5" width="2" height="2" fill="#DC143C"/>
    <rect x="3" y="6" width="6" height="2" fill="#DC143C"/>
    <rect x="4" y="8" width="4" height="2" fill="#DC143C"/>
    <rect x="5" y="10" width="2" height="2" fill="#DC143C"/>
  </svg>
);

// ─── Pixel Character (吉他手) ──────────────────────────────────────────────────────────

const PixelCharacter = () => (
  <svg viewBox="0 0 32 48" width={128} height={192} shapeRendering="crispEdges">
    {/* hair */}
    <rect x="10" y="0" width="12" height="2" fill="#5A3A1E"/>
    <rect x="8" y="2" width="16" height="2" fill="#5A3A1E"/>
    <rect x="8" y="4" width="16" height="4" fill="#5A3A1E"/>
    <rect x="12" y="6" width="8" height="2" fill="#7B5230"/>
    {/* face */}
    <rect x="10" y="8" width="12" height="10" fill="#FFD699"/>
    <rect x="10" y="8" width="1" height="10" fill="#FFC888"/>
    <rect x="21" y="8" width="1" height="10" fill="#FFC888"/>
    {/* glasses */}
    <rect x="10" y="10" width="4" height="4" fill="#5A3A1E"/>
    <rect x="11" y="11" width="2" height="2" fill="#87CEEB"/>
    <rect x="18" y="10" width="4" height="4" fill="#5A3A1E"/>
    <rect x="19" y="11" width="2" height="2" fill="#87CEEB"/>
    <rect x="14" y="11" width="2" height="2" fill="#5A3A1E"/>
    <rect x="12" y="11" width="1" height="1" fill="#5A3A1E"/>
    <rect x="20" y="11" width="1" height="1" fill="#5A3A1E"/>
    {/* mouth */}
    <rect x="14" y="15" width="4" height="1" fill="#DC6B57"/>
    {/* hoodie */}
    <rect x="6" y="18" width="20" height="3" fill="#2E8B2E"/>
    <rect x="4" y="21" width="24" height="14" fill="#2E8B2E"/>
    <rect x="6" y="23" width="20" height="12" fill="#3AA83A"/>
    <rect x="13" y="25" width="6" height="2" fill="#FFD700"/>
    <rect x="14" y="27" width="4" height="2" fill="#FFD700"/>
    {/* arms */}
    <rect x="2" y="23" width="4" height="10" fill="#2E8B2E"/>
    <rect x="26" y="23" width="4" height="10" fill="#2E8B2E"/>
    {/* guitar body */}
    <rect x="28" y="22" width="2" height="3" fill="#A0522D"/>
    <rect x="26" y="25" width="6" height="6" fill="#A0522D"/>
    <rect x="28" y="27" width="2" height="3" fill="#D2691E"/>
    {/* legs */}
    <rect x="8" y="35" width="6" height="8" fill="#2E4A8B"/>
    <rect x="18" y="35" width="6" height="8" fill="#2E4A8B"/>
    {/* shoes */}
    <rect x="6" y="43" width="8" height="4" fill="#8B4513"/>
    <rect x="18" y="43" width="8" height="4" fill="#8B4513"/>
    <rect x="6" y="45" width="8" height="2" fill="#D2691E"/>
    <rect x="18" y="45" width="8" height="2" fill="#D2691E"/>
  </svg>
);

// ─── Pixel Scene (天空 + 草地) ───────────────────────────────────────────────

function PixelScene() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="h-48 bg-gradient-to-b from-[#87CEEB] to-[#F5E6C8] relative">
        {/* clouds */}
        <div className="absolute top-4 left-8">
          <PixelCloud />
        </div>
        <div className="absolute top-8 right-16">
          <PixelCloud />
        </div>
        {/* character */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <PixelCharacter />
        </div>
        {/* laptop */}
        <div className="absolute bottom-1 left-1/4">
          <PixelLaptop />
        </div>
        {/* lantern */}
        <div className="absolute bottom-0 right-4">
          <PixelLantern />
        </div>
        {/* grass */}
        <div className="absolute bottom-0 left-0 right-0">
          <PixelGrass />
        </div>
      </div>
    </div>
  );
}

// ─── Pixel Cloud / Laptop / Lantern / Grass ─────────────────────────────────────────

const PixelCloud = () => (
  <svg viewBox="0 0 32 16" width={64} height={32} shapeRendering="crispEdges">
    <rect x="6" y="4" width="20" height="6" fill="#F5F5DC"/>
    <rect x="4" y="6" width="2" height="2" fill="#F5F5DC"/>
    <rect x="26" y="6" width="2" height="2" fill="#F5F5DC"/>
    <rect x="8" y="2" width="6" height="2" fill="#F5F5DC"/>
    <rect x="14" y="2" width="4" height="2" fill="#F5F5DC"/>
    <rect x="20" y="2" width="4" height="2" fill="#F5F5DC"/>
    <rect x="6" y="10" width="20" height="2" fill="#E8E8D0"/>
  </svg>
);

const PixelLaptop = () => (
  <svg viewBox="0 0 24 20" width={48} height={40} shapeRendering="crispEdges">
    <rect x="2" y="2" width="20" height="14" fill="#5A3A1E"/>
    <rect x="3" y="3" width="18" height="12" fill="#2F8B2F"/>
    <rect x="6" y="6" width="12" height="6" fill="#3AA83A"/>
    <rect x="10" y="6" width="4" height="2" fill="#7FFF7F"/>
    <rect x="10" y="8" width="4" height="1" fill="#7FFF7F"/>
    <rect x="10" y="9" width="4" height="1" fill="#7FFF7F"/>
    <rect x="1" y="16" width="22" height="4" fill="#8B4513"/>
    <rect x="9" y="17" width="6" height="2" fill="#5A3A1E"/>
  </svg>
);

const PixelLantern = () => (
  <svg viewBox="0 0 16 32" width={32} height={64} shapeRendering="crispEdges">
    <rect x="6" y="0" width="4" height="2" fill="#8B4513"/>
    <rect x="5" y="2" width="2" height="2" fill="#8B4513"/>
    <rect x="9" y="2" width="2" height="2" fill="#8B4513"/>
    <rect x="4" y="4" width="8" height="2" fill="#8B4513"/>
    <rect x="4" y="6" width="8" height="14" fill="#FFD700"/>
    <rect x="5" y="7" width="6" height="12" fill="#FFA500"/>
    <rect x="6" y="8" width="4" height="10" fill="#FFD700"/>
    <rect x="4" y="20" width="8" height="2" fill="#8B4513"/>
    <rect x="6" y="22" width="4" height="6" fill="#8B4513"/>
    <rect x="4" y="28" width="8" height="4" fill="#8B4513"/>
  </svg>
);

const PixelGrass = () => (
  <svg viewBox="0 0 200 60" width={200} height={60} shapeRendering="crispEdges" className="hidden sm:block">
    {[...Array(25)].map((_, i) => (
      <rect key={`b-${i}`} x={i * 8} y={30} width={8} height={30} fill="#6B8E23"/>
    ))}
    {[...Array(25)].map((_, i) => (
      <rect key={`t-${i}`} x={i * 8} y={30} width={8} height={6} fill="#8FBC3C"/>
    ))}
    {[...Array(5)].map((_, i) => (
      <rect key={`g-${i}`} x={(i + 1) * 16} y={24} width={4} height={6} fill="#6B8E23"/>
    ))}
  </svg>
);

// ─── Pixel Step Flow ─────────────────────────────────────────────────────

const steps = [
  { icon: "☁️", label: "上传音频/视频" },
  { icon: "📊", label: "结构分析" },
  { icon: "🎵", label: "和弦识别" },
  { icon: "💬", label: "歌词理解" },
  { icon: "🤖", label: "AI 编曲" },
];

function PixelStepFlow() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div
            className="flex flex-col items-center gap-1 bg-[#FBF1DC] border-2 border-[#8B5E3C] p-2 shadow-[3px_3px_0_0_#8B5E3C]"
            style={{ minWidth: "90px" }}
          >
            <div className="text-2xl">{step.icon}</div>
            <div
              className="text-[#5A3A1E] text-center"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "7px", lineHeight: "1.4" }}
            >
              {step.label}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              className="text-[#8B5E3C]"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "12px" }}
            >
              →
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Pixel Grid Background Pattern ──────────────────────────────────────────────────

function PixelGridBg() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          radial-gradient(circle, #E8D5B0 1px, transparent 1px),
          linear-gradient(to right, rgba(139,94,60,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(139,94,60,0.05) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px, 48px 48px, 48px 48px",
      }}
    />
  );
}

// ─── Main Demo ───────────────────────────────────────────────────────────

export function PixelDemoView() {
  const { setView } = useAppStore();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#F5E6C8" }}>
      <PixelGridBg />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Title Section */}
        <div className="text-center mb-8">
          <div
            className="text-[#8B4513] mb-2 flex items-center justify-center gap-2"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "14px" }}
          >
            <PixelStar />
            PIXEL ART DEMO
            <PixelStar />
          </div>
          <h1
            className="text-[#5A3A1E] mb-3"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "28px", letterSpacing: "2px" }}
          >
            AI-ChordCraft
          </h1>
          <div className="flex items-center justify-center gap-4 mb-3">
            <span className="h-px flex-1 bg-[#D4A76A] max-w-[80px]" />
            <span
              className="text-[#D4A76A]"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "11px" }}
            >
              ✦ LLM 赋能的自动扒谱工作台 ✦
            </span>
            <span className="h-px flex-1 bg-[#D4A76A] max-w-[80px]" />
          </div>
          <p
            className="text-[#8B5E3C]"
            style={{ fontFamily: "'VT323', monospace", fontSize: "18px" }}
          >
            从音频 / 视频到结构化和和谱、让扒谱结果可演奏、可检查、可追问。
          </p>
        </div>

        {/* Pixel Scene */}
        <div className="mb-8 border-2 border-[#8B5E3C] shadow-[6px_6px_0_0_#8B5E3C] bg-[#FBF1DC]">
          <PixelScene />
        </div>

        {/* Three Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <PixelCard title="音乐结构分析" number={1}>
            <PixelTimeline />
            <div className="mt-3 space-y-1 text-[#5A3A1E]" style={{ fontFamily: "'VT323', monospace", fontSize: "16px" }}>
              <div>🎵 SongFormer 段落切分</div>
              <div>自动识别 Intro / Verse / Chorus / Bridge / Outro</div>
              <div>输出结构标签与时间边界</div>
            </div>
          </PixelCard>

          <PixelCard title="自动和弦识别" number={2}>
            <div className="mb-2">
              <PixelWaveformSVG />
              <div className="flex justify-between mt-1 text-[#8B5E3C]" style={{ fontFamily: "'VT323', monospace", fontSize: "12px" }}>
                <span>0:00</span><span>0:30</span><span>1:00</span><span>1:30</span><span>2:00</span>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              <ChordTag name="C" /><ChordTag name="G" /><ChordTag name="Am" /><ChordTag name="F" /><ChordTag name="G" />
            </div>
            <div className="space-y-1 text-[#5A3A1E]" style={{ fontFamily: "'VT323', monospace", fontSize: "16px" }}>
              <div>基于 BTC 系列 ACR</div>
              <div>输出精确和弦及和弦事件</div>
              <div>自动映射到歌曲段落</div>
            </div>
          </PixelCard>

          <PixelCard title="LLM 音乐理解与推理" number={3}>
            <div className="flex items-start gap-2 mb-3">
              <div className="text-3xl">🤖</div>
              <div>
                <div className="text-[#6B8E23] font-bold" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}>
                  MOSS-Music
                </div>
                <div className="text-[#5A3A1E]" style={{ fontFamily: "'VT323', monospace", fontSize: "14px" }}>
                  SGLang 服务
                </div>
              </div>
            </div>
            <div className="space-y-1 text-[#5A3A1E]" style={{ fontFamily: "'VT323', monospace", fontSize: "16px" }}>
              <div>📝 歌词 ASR</div>
              <div>🧠 整体语境、音乐问答</div>
              <div>🎼 支持编配与段落级解释</div>
            </div>
          </PixelCard>
        </div>

        {/* Workflow Section */}
        <div className="mb-8 bg-[#FBF1DC] border-2 border-[#8B5E3C] shadow-[6px_6px_0_0_#8B5E3C] p-4">
          <div className="flex items-center gap-2 mb-3">
            <PixelNote />
            <span
              className="text-[#8B5E3C]"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "11px" }}
            >
              工 作 流 程
            </span>
          </div>
          <PixelStepFlow />
        </div>

        {/* Audio + Chord Sheet Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <PixelCard title="AUDIO">
            <PixelAudioPlayer />
          </PixelCard>

          <PixelCard title="CHORD SHEET">
            <PixelChordSheet />
          </PixelCard>
        </div>

        {/* Pixel Buttons Showcase */}
        <div className="mb-8 bg-[#FBF1DC] border-2 border-[#8B5E3C] shadow-[6px_6px_0_0_#8B5E3C] p-4">
          <div className="text-[#8B5E3C] mb-3 font-bold" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px" }}>
            PIXEL BUTTONS
          </div>
          <div className="flex flex-wrap gap-3">
            <PixelButton color="brown" onClick={() => setView("home")}>返回首页</PixelButton>
            <PixelButton color="amber" onClick={() => setView("courses")}>课程中心</PixelButton>
            <PixelButton color="green" onClick={() => setView("script-generator")}>AI 文案</PixelButton>
            <PixelButton color="red" onClick={() => setView("tools")}>工具箱</PixelButton>
            <PixelButton color="cream" onClick={() => setView("dashboard")}>我的学习</PixelButton>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-3">
            <PixelHeart />
            <span
              className="text-[#8B5E3C]"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px" }}
            >
              荒哥说电影 · Pixel Art Demo
            </span>
            <PixelStar />
          </div>
        </div>
      </div>
    </div>
  );
}
