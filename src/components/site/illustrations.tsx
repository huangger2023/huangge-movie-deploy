"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 手绘 SVG 插画组件库
 *
 * 设计原则：
 * - 所有线条用 currentColor，父级通过 text-color 控色
 * - 线宽 1.4-1.8 之间，刻意带一点不规则（去机械感）
 * - 不用 lucide-react 的几何图标，自画带电影/创作语境的笔触
 *
 * 使用示例：
 *   <FilmStrip className="text-amber-400" />
 *   <Slate className="text-foreground/80" />
 */

type SvgProps = React.SVGProps<SVGSVGElement> & { className?: string };

/* ---------- 1. 胶片肩衬（用于课程卡海报肩部装饰） ---------- */
export function FilmShoulder({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className={cn("w-full h-6", className)}
      {...props}
    >
      <rect x="0" y="0" width="240" height="24" fill="currentColor" opacity="0.15" />
      {/* 上下两条 */}
      <line x1="0" y1="3" x2="240" y2="3" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <line x1="0" y1="21" x2="240" y2="21" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      {/* 穿孔 */}
      {Array.from({ length: 16 }).map((_, i) => (
        <rect
          key={i}
          x={6 + i * 15}
          y="9"
          width="8"
          height="6"
          rx="1"
          fill="currentColor"
          opacity="0.55"
        />
      ))}
    </svg>
  );
}

/* ---------- 2. 场记板（电影解说创作的图形锚） ---------- */
export function Slate({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-16 h-16", className)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* 上盖（条纹） */}
      <path
        d="M8 22 L 56 18 L 56 28 L 8 32 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      {/* 黑白相间斜条 */}
      <path d="M16 22.7 L 14 30.7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M24 22 L 22 30" stroke="currentColor" strokeWidth="1.4" />
      <path d="M32 21.3 L 30 29.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M40 20.7 L 38 28.7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M48 20 L 46 28" stroke="currentColor" strokeWidth="1.4" />
      {/* 主体 */}
      <path
        d="M10 32 L 56 28 L 56 56 L 10 56 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      {/* 三行线 */}
      <line x1="16" y1="40" x2="48" y2="38.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <line x1="16" y1="46" x2="48" y2="44.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <line x1="16" y1="52" x2="36" y2="50.8" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      {/* 铰链点 */}
      <circle cx="14" cy="22" r="1.4" fill="currentColor" />
      <circle cx="54" cy="18" r="1.4" fill="currentColor" />
    </svg>
  );
}

/* ---------- 3. 吊灯（hero 角落装饰） ---------- */
export function StudioLight({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 80 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-20 h-20", className)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* 吊线 */}
      <line x1="40" y1="0" x2="40" y2="22" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      {/* 灯帽顶圈 */}
      <ellipse cx="40" cy="24" rx="8" ry="2.5" stroke="currentColor" strokeWidth="1.4" />
      {/* 灯罩 */}
      <path d="M32 24 L 18 60 L 62 60 L 48 24" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* 内部细线 */}
      <line x1="34" y1="34" x2="32" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="46" y1="34" x2="48" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* 灯口圈 */}
      <ellipse cx="40" cy="60" rx="22" ry="3" stroke="currentColor" strokeWidth="1.4" />
      {/* 光锥 */}
      <line x1="22" y1="64" x2="14" y2="86" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="2 3" />
      <line x1="58" y1="64" x2="66" y2="86" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="2 3" />
      <line x1="40" y1="64" x2="40" y2="88" stroke="currentColor" strokeWidth="1" opacity="0.3" strokeDasharray="2 3" />
    </svg>
  );
}

/* ---------- 4. 手书弯箭头（用于「点这里」式指向） ---------- */
export function ScribbleArrow({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 80 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-20 h-14", className)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path
        d="M5 12 Q 25 6, 45 16 T 70 38 Q 73 44, 70 50"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <path d="M62 47 L 70 52 L 66 42" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

/* ---------- 5. 圆圈强调（在标题旁边画一圈） ---------- */
export function CircleEmphasis({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 200 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className={cn("absolute inset-0 w-full h-full", className)}
      {...props}
    >
      <path
        d="M 100 8 Q 30 14, 14 40 Q 22 70, 100 72 Q 180 70, 188 40 Q 178 12, 110 9"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}

/* ---------- 6. 多子（拍摄板小红点 / 状态点） ---------- */
export function ShotMarker({
  active = false,
  className,
  ...props
}: SvgProps & { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-4 h-4", className)}
      {...props}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.4"
        fill={active ? "currentColor" : "none"}
        opacity={active ? 1 : 0.6}
      />
      {active && <circle cx="8" cy="8" r="2.5" fill="white" />}
    </svg>
  );
}

/* ---------- 7. 手书下划线（替代规整下划线） ---------- */
export function ScribbleUnderline({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 200 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className={cn("w-full h-3", className)}
      {...props}
    >
      <path
        d="M 4 8 Q 30 2, 60 7 T 120 6 T 180 8 Q 192 9, 196 6"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------- 8. 海报黑框（课程卡用） ---------- */
export function PosterFrame({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) {
  return (
    <div
      className={cn("relative ring-1 ring-foreground/15 ring-offset-2 ring-offset-background/0", className)}
      {...props}
    >
      {/* 四角小标记 */}
      <span className="absolute top-1 left-1 w-2 h-2 border-t border-l border-foreground/40" />
      <span className="absolute top-1 right-1 w-2 h-2 border-t border-r border-foreground/40" />
      <span className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-foreground/40" />
      <span className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-foreground/40" />
      {children}
    </div>
  );
}
