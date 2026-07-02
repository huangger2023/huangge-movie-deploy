"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 豆瓣电影跳转入口。
 *
 * 两种用法：
 * - mode="home"（默认）：固定打开豆瓣电影首页（movie.douban.com），
 *   让用户去豆瓣浏览挑片，挑中后手动回来填电影名。
 *   不依赖输入框内容，任何时候都可点。
 * - mode="search"：根据当前电影名在豆瓣做关键字搜索，
 *   用于核对简介/评分等资料。电影名为空时置灰。
 */
export function DoubanSearchButton({
  movieTitle,
  mode = "home",
  className,
  label,
}: {
  /** 当前电影名（search 模式用于检索；home 模式仅占位不读） */
  movieTitle?: string;
  mode?: "home" | "search";
  className?: string;
  label?: string;
}) {
  const isHome = mode === "home";
  const trimmed = (movieTitle ?? "").trim();
  const href = isHome
    ? "https://movie.douban.com/"
    : trimmed
      ? `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(
          trimmed
        )}&cat=1002`
      : null;
  const disabled = !href;

  return (
    <a
      href={href ?? "#"}
      target={href ? "_blank" : undefined}
      rel={href ? "noopener noreferrer" : undefined}
      aria-disabled={disabled}
      onClick={(e) => {
        if (!href) e.preventDefault();
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors",
        href
          ? "hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          : "cursor-not-allowed opacity-50",
        className
      )}
      title={
        isHome
          ? "去豆瓣电影挑片"
          : href
            ? `在豆瓣搜索“${trimmed}”`
            : "填写电影名后可查豆瓣"
      }
    >
      <ExternalLink className="h-3 w-3" />
      {label ?? (isHome ? "去豆瓣选片" : "查豆瓣")}
    </a>
  );
}