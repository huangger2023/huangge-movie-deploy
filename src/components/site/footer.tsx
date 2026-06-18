"use client";

import { Film, Sparkles, Mail, MessageCircle, Github, Heart } from "lucide-react";
import { useAppStore, type ViewKey } from "@/lib/store";

const FOOTER_LINKS: { title: string; links: { label: string; view?: ViewKey }[] }[] = [
  {
    title: "课程中心",
    links: [
      { label: "全部课程", view: "courses" },
      { label: "入门破冰营", view: "courses" },
      { label: "高阶大师课", view: "courses" },
      { label: "运营变现", view: "courses" },
    ],
  },
  {
    title: "创作工具",
    links: [
      { label: "AI文案生成", view: "script-generator" },
      { label: "创作工作台", view: "workspace" },
      { label: "爆款标题", view: "tools" },
      { label: "黄金开头", view: "tools" },
    ],
  },
  {
    title: "帮助支持",
    links: [
      { label: "我的学习", view: "dashboard" },
      { label: "登录注册", view: "auth" },
      { label: "常见问题" },
      { label: "联系客服" },
    ],
  },
];

export function Footer() {
  const setView = useAppStore((s) => s.setView);

  return (
    <footer className="mt-auto border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Film className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-base font-bold">影述学院</p>
                <p className="text-xs text-muted-foreground">
                  抖音电影解说创作平台
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              专注抖音电影解说创作教学，AI
              智能生成独家精选文案，配套爆款标题、黄金开头、文案润色等辅助创作工具，让每一位创作者都能做出百万播放。
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                AI 驱动创作
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent-foreground">
                <Heart className="h-3 w-3" />
                300+ 学员爆款
              </span>
            </div>
          </div>

          {/* Links */}
          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold">{group.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => link.view && setView(link.view)}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} 影述学院 · 保留所有权利 · 专注电影解说创作教育
          </p>
          <div className="flex items-center gap-3 text-muted-foreground">
            <a className="transition-colors hover:text-primary" href="#" aria-label="邮箱">
              <Mail className="h-4 w-4" />
            </a>
            <a className="transition-colors hover:text-primary" href="#" aria-label="微信">
              <MessageCircle className="h-4 w-4" />
            </a>
            <a className="transition-colors hover:text-primary" href="#" aria-label="github">
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
