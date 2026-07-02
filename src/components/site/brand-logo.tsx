"use client";

import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════
// 像素荒哥头像 — 8x10 像素网格 SVG（更紧凑）
// 戴眼镜的像素小人，棕色头发，棕色眼睛，微笑
// 配色与全局像素风保持一致
// ═══════════════════════════════════════════

const PIXEL_SIZE = 6; // 每个像素的大小（会被 CSS 缩放）

function PixelAvatar({ size = 48, height = "auto" }: { size?: number; height?: string }) {
  // 像素地图：8列 x 10行
  // 颜色映射：
  //   0 = 透明
  //   1 = 棕色头发 (#5A3A1E)
  //   2 = 肤色 (#FFD699)
  //   3 = 眼镜黑框 (#5A3A1E)
  //   4 = 眼睛白色 (#F5F5DC)
  //   5 = 眼睛深色 (#5A3A1E)
  //   6 = 嘴 (#DC6B57)
  //   7 = 衣服绿 (#2E8B2E)
  //   8 = 衣服深绿 (#1E6B1E)

  const pixels = [
    [0,0,1,1,1,1,0,0],   // 0: 头发顶
    [0,1,1,1,1,1,1,0],   // 1: 头发
    [1,1,1,2,2,2,1,1],   // 2: 头发+脸
    [1,3,3,3,3,3,3,1],   // 3: 头发+眼镜
    [1,3,4,3,3,4,3,1],   // 4: 眼镜+眼睛白
    [1,3,5,3,3,5,3,1],   // 5: 眼镜+眼睛
    [1,1,2,2,6,2,1,1],   // 6: 脸+嘴
    [1,1,2,2,2,2,1,1],   // 7: 脸
    [0,1,2,2,2,2,1,0],   // 8: 脸侧
    [0,7,7,7,7,7,7,0],   // 9: 衣服
  ];

  const colorMap: Record<number, string> = {
    0: "transparent",
    1: "#5A3A1E",  // 棕色头发
    2: "#FFD699",  // 肤色
    3: "#5A3A1E",  // 眼镜框
    4: "#F5F5DC",  // 眼睛白
    5: "#5A3A1E",  // 眼睛
    6: "#DC6B57",  // 嘴
    7: "#2E8B2E",  // 衣服绿
    8: "#1E6B1E",  // 衣服深
    9: "#FFFFFF",  // 高光
  };

  return (
    <svg
      viewBox={`0 0 ${8 * PIXEL_SIZE} ${10 * PIXEL_SIZE}`}
      width={size}
      height={size * 1.25}
      shapeRendering="crispEdges"
      aria-label="荒哥像素头像"
    >
      {pixels.flatMap((row, rowIdx) =>
        row.map((color, colIdx) =>
          color !== 0 ? (
            <rect
              key={`${rowIdx}-${colIdx}`}
              x={colIdx * PIXEL_SIZE}
              y={rowIdx * PIXEL_SIZE}
              width={PIXEL_SIZE}
              height={PIXEL_SIZE}
              fill={colorMap[color]}
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════
// 像素电影胶片图标
// ═══════════════════════════════════════════

function PixelFilmReel({ size = 32 }: { size?: number }) {
  const PIXEL_SIZE = 4;
  // 4x4 像素胶片
  const pixels = [
    [1,0,0,1],
    [0,2,2,0],
    [0,2,2,0],
    [1,0,0,1],
  ];

  const colorMap: Record<number, string> = {
    0: "transparent",
    1: "#8B4513",
    2: "#FFD700",
  };

  return (
    <svg
      viewBox={`0 0 ${4 * PIXEL_SIZE} ${4 * PIXEL_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {pixels.flatMap((row, rowIdx) =>
        row.map((color, colIdx) =>
          color !== 0 ? (
            <rect
              key={`${rowIdx}-${colIdx}`}
              x={colIdx * PIXEL_SIZE}
              y={rowIdx * PIXEL_SIZE}
              width={PIXEL_SIZE}
              height={PIXEL_SIZE}
              fill={colorMap[color]}
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════
// 像素闪烁星星装饰
// ═══════════════════════════════════════════

function PixelSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" width={12} height={12} shapeRendering="crispEdges" className={className} aria-hidden="true">
      <rect x="3" y="0" width="2" height="2" fill="#FFD700"/>
      <rect x="1" y="2" width="2" height="2" fill="#FFD700"/>
      <rect x="5" y="2" width="2" height="2" fill="#FFD700"/>
      <rect x="3" y="3" width="2" height="2" fill="#FFD700"/>
      <rect x="3" y="5" width="2" height="2" fill="#FFD700"/>
    </svg>
  );
}

// ═══════════════════════════════════════════
// BrandLogo — 像素风荒哥 Logo
// ═══════════════════════════════════════════

export function BrandLogo({
  size = "md",
  showTagline = false,
  className,
  onClick,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const avatarSizeMap = { sm: 18, md: 24, lg: 32, xl: 44 };
  const titleSizeMap = { sm: "8px", md: "10px", lg: "13px", xl: "16px" };
  const subtitleSizeMap = { sm: "7px", md: "9px", lg: "11px", xl: "13px" };

  const content = (
    <div className="flex items-center gap-2">
      {/* 像素荒哥头像 */}
      <div className="shrink-0">
        <PixelAvatar size={avatarSizeMap[size]} />
      </div>

      <div className="flex flex-col items-start gap-0.5">
        {/* 主标题：荒哥 */}
        <div className="flex items-center gap-1">
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: titleSizeMap[size],
              color: "#8B4513",
              letterSpacing: "1px",
              lineHeight: "1",
            }}
          >
            荒哥
          </span>
          <PixelSparkle />
        </div>

        {/* 副标题：说电影 */}
        <div className="flex items-center gap-1">
          <PixelFilmReel size={size === "sm" ? 12 : size === "md" ? 16 : size === "lg" ? 20 : 24} />
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: subtitleSizeMap[size],
              color: "#D4A76A",
              letterSpacing: "0.5px",
              lineHeight: "1",
            }}
          >
            说电影
          </span>
        </div>

        {/* Tagline */}
        {showTagline && (
          <span
            className="text-muted-foreground"
            style={{ fontFamily: "'VT323', monospace", fontSize: "14px" }}
          >
            电影解说课程与实操工具
          </span>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "group flex shrink-0 items-center whitespace-nowrap transition-all duration-100 hover:opacity-80 focus:outline-none",
          className
        )}
        aria-label="荒哥说电影 · 返回首页"
      >
        {content}
      </button>
    );
  }

  return <div className={cn("group flex items-center gap-2", className)}>{content}</div>;
}

// ═══════════════════════════════════════════
// BrandName — 纯文字像素风
// ═══════════════════════════════════════════

export function BrandName({
  size = "md",
  className,
  showTagline = false,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: string | boolean;
}) {
  const titleSizeMap = { sm: "10px", md: "14px", lg: "18px", xl: "22px" };
  const subtitleSizeMap = { sm: "10px", md: "14px", lg: "16px", xl: "18px" };

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <div className="flex items-center gap-1">
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: titleSizeMap[size],
            color: "#8B4513",
            letterSpacing: "1px",
            lineHeight: "1",
          }}
        >
          荒哥
        </span>
        <PixelSparkle />
      </div>
      <div className="flex items-center gap-1">
        <PixelFilmReel size={size === "sm" ? 12 : size === "md" ? 16 : size === "lg" ? 20 : 24} />
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: subtitleSizeMap[size],
            color: "#D4A76A",
            letterSpacing: "0.5px",
            lineHeight: "1",
          }}
        >
          说电影
        </span>
      </div>
      {showTagline && (
        <span
          className="text-muted-foreground"
          style={{ fontFamily: "'VT323', monospace", fontSize: "14px" }}
        >
          电影解说课程与实操工具
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// BrandIcon — 像素荒哥头像（独立图标版）
// ═══════════════════════════════════════════

export function BrandIcon({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeMap = { sm: 28, md: 36, lg: 44, xl: 56 };

  return (
    <div
      className={cn(
        "flex items-center justify-center border-2 border-[#8B5E3C] shadow-[4px_4px_0_0_#8B5E3C] bg-[#FBF1DC]",
        className
      )}
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
      }}
      aria-label="荒哥说电影"
    >
      <PixelAvatar size={sizeMap[size] - 10} />
    </div>
  );
}
