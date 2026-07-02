"use client";

import { Film, Sparkles, Mail, MessageCircle, Github } from "lucide-react";
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
    title: "产品方案",
    links: [
      { label: "方案总览", view: "product-home" },
      { label: "CineFlow Pro", view: "cineflow-suite" },
      { label: "hgTTS-Pro", view: "hgtts-pro" },
      { label: "资源中心", view: "resources" },
    ],
  },
  {
    title: "帮助支持",
    links: [
      { label: "我的学习", view: "dashboard" },
      { label: "登录注册", view: "auth" },
      { label: "支付通道", view: "payment" },
      { label: "联系我们", view: "contact" },
    ],
  },
];

export function Footer() {
  const setView = useAppStore((s) => s.setView);

  return (
    <footer className="mt-auto border-t border-border/60 bg-card relative">
      {/* 顶部色彩装饰条 */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-soft">
                <Film className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-base font-bold tracking-tight">荒哥说电影</p>
                <p className="text-xs text-muted-foreground">
                  抖音电影解说课程与实操工具
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              课程和工具共用同一套方法论。课程负责讲透三阶段创作思路，
              生成器负责按同样的方法把开头、剧情、结尾升华一步步落成可用文案。
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                AI 驱动创作
              </span>
            </div>
          </div>

          {/* Links */}
          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold tracking-tight">{group.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => link.view && setView(link.view)}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-2 font-medium"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground text-balance text-center sm:text-left">
            © {new Date().getFullYear()} 荒哥说电影 · 抖音电影解说三阶段教学与创作平台
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
