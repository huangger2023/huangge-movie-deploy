"use client";

import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  FolderDown,
  MessageCircle,
  Mic2,
  Package,
  Sparkles,
  Video,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QQ_GROUP } from "@/lib/qq-group";
import { useAppStore, type ViewKey } from "@/lib/store";
import { cn } from "@/lib/utils";

type ProductKey =
  | "product-home"
  | "cineflow-suite"
  | "ai-copywriting"
  | "hgtts-pro"
  | "visual-match"
  | "resources"
  | "payment"
  | "contact";

type ProductAction = {
  label: string;
  view?: ViewKey;
  href?: string;
  copy?: string;
  variant?: "primary" | "secondary";
};

type ProductCard = {
  title: string;
  tag?: string;
  body: string;
  items?: string[];
  action?: ProductAction;
  featured?: boolean;
};

type ProductPage = {
  eyebrow: string;
  title: string;
  lead: string;
  quote?: string;
  note?: string;
  icon: React.ElementType;
  tone?: "warm" | "cyan";
  actions?: ProductAction[];
  sections: {
    kicker?: string;
    title: string;
    intro?: string;
    cards?: ProductCard[];
    steps?: string[];
    pricing?: ProductCard[];
  }[];
};

const PRODUCT_NAV: { key: ProductKey; label: string }[] = [
  { key: "product-home", label: "方案总览" },
  { key: "cineflow-suite", label: "CineFlow Pro" },
  { key: "ai-copywriting", label: "荒哥AI" },
  { key: "hgtts-pro", label: "hgTTS-Pro" },
  { key: "visual-match", label: "荒的一匹" },
  { key: "resources", label: "资源中心" },
];

const productPricing: ProductCard[] = [
  {
    title: "CineFlow Pro",
    tag: "学员免费",
    body: "学员工具箱，不单独标价。用于把资源、流程、交付和协同串起来。",
    items: ["学员免费使用", "先搭流程，再补模块", "适合长期账号和团队协同"],
    featured: true,
  },
  {
    title: "荒哥AI",
    tag: "核心中的核心",
    body: "文案试用的核心入口，优先验证脚本生成、改写提质和最终输出感觉。",
    items: ["学员价 89 元 / 月", "外部参考价 89 元 / 月", "openclaw 只负责前置数据层"],
  },
  {
    title: "hgTTS-Pro",
    tag: "选用模块",
    body: "适合单独补强配音、本地音色管理和长期旁白稳定性。",
    items: ["学员价 699 元 / 年", "外部参考价 699 元 / 年", "支持试用后开通"],
  },
  {
    title: "荒的一匹",
    tag: "选用模块",
    body: "适合解决有脚本但找镜头太慢的问题，补画面匹配和剪辑衔接效率。",
    items: ["学员价 499 元 / 永久", "外部参考价 699 元 / 永久", "支持试用后购买"],
  },
];

const defaultResources: ProductCard[] = [
  {
    title: "CineFlow Pro 学员工具箱",
    tag: "学员入口",
    body: "学员使用的流程工具箱入口，具体发放以课程授权和交付说明为准。",
    action: { label: "联系获取入口", view: "contact" },
  },
  {
    title: "荒哥AI 试用入口",
    tag: "文案核心",
    body: "先验证脚本生成、改写提质和口播感，再决定后续模块怎么配。",
    action: { label: "打开试用入口", href: "https://new.huangge.de/" },
  },
  {
    title: "hgTTS-Pro",
    tag: "配音模块",
    body: "用于本地配音、音色管理和长期旁白复用。",
    action: { label: "咨询试用", view: "contact" },
  },
  {
    title: "荒的一匹",
    tag: "画面匹配",
    body: "用于找画面、对镜头和剪辑匹配效率提升。",
    action: { label: "咨询试用", view: "contact" },
  },
];

const pages: Record<ProductKey, ProductPage> = {
  "product-home": {
    eyebrow: "AI 影视解说生产系统",
    title: "先把流程搭起来，再按需增加模块",
    lead:
      "CineFlow Pro 面向想稳定做内容、做交付、做团队协作的创作者与工作室。首页先帮你看清哪些属于主方案，哪些属于按需选配，避免一上来就把判断做乱。",
    quote: "AI很简单，复杂的是人。",
    note: "工具不难，难的是前置数据、判断标准和输出要求。真正先被验证的，是荒哥AI这一层。",
    icon: Package,
    actions: [
      { label: "看方案结构", view: "cineflow-suite" },
      { label: "联系咨询", view: "contact", variant: "secondary" },
    ],
    sections: [
      {
        kicker: "系统定位宣言",
        title: "整套系统，只为做精选和独家",
        intro:
          "不是为了堆量，不是为了做泛内容，也不是为了追低质量流水线。整套系统的判断标准只有一个：把内容压向更值钱的精选表达和更难复制的独家结果。",
        cards: [
          { title: "做精选", body: "选题、文案、节奏和镜头都先过筛，不做泛滥内容。" },
          { title: "做独家", body: "不是跟风搬运，而是把表达、判断和结果拉开差距。" },
        ],
      },
      {
        kicker: "方案结构",
        title: "先分清核心入口和主方案，再决定是否按需增加模块",
        cards: [
          {
            title: "CineFlow Pro",
            tag: "主方案 / 学员免费",
            body: "主方案解决流程落地问题，负责把资源、流程、交付和协同串起来。",
            items: ["先搭流程", "先看整体", "更适合长期使用"],
            action: { label: "查看详情", view: "cineflow-suite" },
            featured: true,
          },
          {
            title: "荒哥AI",
            tag: "核心中的核心",
            body: "文案试用的核心入口，不应被归为普通选配。",
            items: ["脚本生成", "改写提质", "口播感验证"],
            action: { label: "进入模块", view: "ai-copywriting" },
          },
          {
            title: "hgTTS-Pro",
            tag: "选用模块",
            body: "适合单独补强配音、本地音色管理和长期旁白稳定性。",
            action: { label: "进入模块", view: "hgtts-pro" },
          },
          {
            title: "荒的一匹",
            tag: "选用模块",
            body: "适合单独补强找画面、对镜头和剪辑匹配效率。",
            action: { label: "进入模块", view: "visual-match" },
          },
        ],
      },
      {
        kicker: "价格参考",
        title: "不标虚价，先验证再说",
        pricing: productPricing,
      },
    ],
  },
  "cineflow-suite": {
    eyebrow: "主方案 · CineFlow Pro",
    title: "流程落地，不只是工具堆叠",
    lead:
      "CineFlow Pro 是整套系统的主方案，负责把资源、流程、交付和协同串起来。学员免费使用，不单独标价。",
    icon: Package,
    actions: [
      { label: "进入荒哥AI", view: "ai-copywriting" },
      { label: "资源中心", view: "resources", variant: "secondary" },
    ],
    sections: [
      {
        kicker: "定位",
        title: "主方案解决什么问题",
        cards: [
          { title: "流程落地", body: "把选题、文案、配音、剪辑、发布串成可复用的标准流程。" },
          { title: "交付协同", body: "适合个人长期做号，也适合小团队分工协作。" },
          { title: "学员免费", body: "不单独标价，课程学员直接使用。" },
        ],
      },
      {
        kicker: "模块关系",
        title: "和选配模块怎么配合",
        cards: [
          { title: "荒哥AI", body: "文案核心入口，生成、改写、提质都在这里。", action: { label: "进入", view: "ai-copywriting" } },
          { title: "hgTTS-Pro", body: "配音补强，音色管理和长期旁白复用。", action: { label: "进入", view: "hgtts-pro" } },
          { title: "荒的一匹", body: "画面匹配，找镜头和对画面效率提升。", action: { label: "进入", view: "visual-match" } },
        ],
      },
    ],
  },
  "ai-copywriting": {
    eyebrow: "核心模块 · 荒哥AI",
    title: "文案是整套系统的核心入口",
    lead:
      "荒哥AI负责脚本生成、改写提质和口播感验证。先在这里跑通文案，再决定后续模块怎么配。",
    icon: Sparkles,
    actions: [
      { label: "打开试用入口", href: "https://new.huangge.de/" },
      { label: "联系咨询", view: "contact", variant: "secondary" },
    ],
    sections: [
      {
        kicker: "核心能力",
        title: "文案全链路覆盖",
        cards: [
          { title: "脚本生成", body: "输入片名和参数，生成结构完整的解说文案初稿。" },
          { title: "改写提质", body: "把平淡文案改造成爆款，增强转折、画面感和情绪张力。" },
          { title: "口播感验证", body: "预置多声线试听，验证文案的口播效果。" },
        ],
      },
      {
        kicker: "价格",
        title: "学员价 89 元 / 月",
        pricing: [productPricing[1]],
      },
    ],
  },
  "hgtts-pro": {
    eyebrow: "选用模块 · hgTTS-Pro",
    title: "配音补强和音色管理",
    lead:
      "适合单独补强配音、本地音色管理和长期旁白稳定性。学员价 699 元 / 年，支持试用后开通。",
    icon: Mic2,
    actions: [
      { label: "咨询试用", view: "contact" },
      { label: "资源中心", view: "resources", variant: "secondary" },
    ],
    sections: [
      {
        kicker: "核心能力",
        title: "配音全流程工具",
        cards: [
          { title: "音色复刻", body: "上传参考音频，复刻同款声线。" },
          { title: "音色设计", body: "自然语言描述想要的音色风格，AI 生成。" },
          { title: "预置音色", body: "多种预置声线，挑出最适合你账号的音色。" },
        ],
      },
      {
        kicker: "价格",
        title: "学员价 699 元 / 年",
        pricing: [productPricing[2]],
      },
    ],
  },
  "visual-match": {
    eyebrow: "选用模块 · 荒的一匹",
    title: "画面匹配和剪辑衔接",
    lead:
      "适合解决有脚本但找镜头太慢的问题，补画面匹配和剪辑衔接效率。学员价 499 元 / 永久。",
    icon: Video,
    actions: [
      { label: "咨询试用", view: "contact" },
      { label: "资源中心", view: "resources", variant: "secondary" },
    ],
    sections: [
      {
        kicker: "核心能力",
        title: "画面匹配工具",
        cards: [
          { title: "找画面", body: "根据文案内容自动匹配可用镜头素材。" },
          { title: "对镜头", body: "提高剪辑时的画面匹配效率。" },
          { title: "剪辑衔接", body: "优化转场和节奏，让成片更流畅。" },
        ],
      },
      {
        kicker: "价格",
        title: "学员价 499 元 / 永久",
        pricing: [productPricing[3]],
      },
    ],
  },
  resources: {
    eyebrow: "资源中心",
    title: "所有入口和资源汇总",
    lead: "这里汇总了各模块的入口、试用链接和获取方式。",
    icon: FolderDown,
    sections: [
      {
        kicker: "模块入口",
        title: "按需选择，先验证再决定",
        cards: defaultResources,
      },
    ],
  },
  payment: {
    eyebrow: "支付通道",
    title: "学员价和外部参考价",
    lead: "所有模块的支付通道和价格汇总。学员享受专属价格。",
    icon: CreditCard,
    sections: [
      {
        kicker: "价格表",
        title: "透明定价，不标虚价",
        pricing: productPricing,
      },
      {
        kicker: "支付方式",
        title: "联系客服完成支付",
        cards: [
          { title: "微信支付", body: "联系客服微信，确认学员身份后支付。", action: { label: "联系客服", view: "contact" } },
          { title: "支付宝", body: "联系客服支付宝，确认学员身份后支付。", action: { label: "联系客服", view: "contact" } },
        ],
      },
    ],
  },
  contact: {
    eyebrow: "联系我们",
    title: "联系客服获取入口和试用",
    lead: "有任何问题或想试用某个模块，通过以下方式联系我们。",
    icon: MessageCircle,
    sections: [
      {
        kicker: "联系方式",
        title: "选择最方便的方式",
        cards: [
          { title: "QQ 群", body: "加入学员 QQ 群，群内有客服解答问题。", action: { label: "一键加群", copy: QQ_GROUP } },
          { title: "微信", body: "添加客服微信，一对一咨询。", action: { label: "联系客服" } },
        ],
      },
    ],
  },
};

export function ProductMarketingView({ pageKey }: { pageKey: ProductKey }) {
  const setView = useAppStore((s) => s.setView);
  const page = pages[pageKey];
  if (!page) return null;

  const Icon = page.icon;

  const handleAction = (action: ProductAction) => {
    if (action.copy) {
      navigator.clipboard.writeText(action.copy).then(() => toast.success("已复制"));
      return;
    }
    if (action.href) {
      window.open(action.href, "_blank");
      return;
    }
    if (action.view) {
      setView(action.view);
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-cinema-radial" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-30" />

      <div className="relative container-page py-10 sm:py-14">
        {/* Nav */}
        <div className="mb-8 flex flex-wrap gap-1.5 rounded-xl border border-border/50 bg-card/30 p-1.5">
          {PRODUCT_NAV.map((item) => {
            const active = item.key === pageKey;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key as ViewKey)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-green-500 text-white"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">{page.eyebrow}</span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            {page.lead}
          </p>
          {page.quote && (
            <blockquote className="mt-6 border-l-2 border-primary/30 pl-4 text-base italic text-foreground/80">
              "{page.quote}"
            </blockquote>
          )}
          {page.note && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
              {page.note}
            </p>
          )}
          {page.actions && (
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {page.actions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant === "secondary" ? "outline" : "default"}
                  onClick={() => handleAction(action)}
                  className={cn(
                    "rounded-full",
                    action.variant !== "secondary" && "bg-orange-500 text-white hover:bg-orange-600 shadow-soft"
                  )}
                >
                  {action.label}
                  {action.href && <ExternalLink className="ml-1.5 h-3.5 w-3.5" />}
                  {!action.href && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {page.sections.map((section, si) => (
            <div key={si}>
              {section.kicker && (
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {section.kicker}
                </div>
              )}
              <h2 className="mb-4 text-xl font-bold tracking-tight sm:text-2xl">
                {section.title}
              </h2>
              {section.intro && (
                <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {section.intro}
                </p>
              )}

              {/* Cards */}
              {section.cards && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.cards.map((card, ci) => (
                    <Card
                      key={ci}
                      className={cn(
                        "p-5 transition-all hover:shadow-soft",
                        card.featured && "border-primary/30 ring-1 ring-primary/20"
                      )}
                    >
                      {card.tag && (
                        <span className="mb-2 inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          {card.tag}
                        </span>
                      )}
                      <h3 className="mb-1.5 text-sm font-semibold">{card.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {card.body}
                      </p>
                      {card.items && (
                        <ul className="mt-3 space-y-1.5">
                          {card.items.map((item, ii) => (
                            <li key={ii} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                      {card.action && (
                        <button
                          onClick={() => handleAction(card.action!)}
                          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 hover:underline"
                        >
                          {card.action.label}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Pricing */}
              {section.pricing && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {section.pricing.map((card, ci) => (
                    <Card
                      key={ci}
                      className={cn(
                        "p-5 transition-all hover:shadow-soft",
                        card.featured && "border-primary/30 ring-1 ring-primary/20"
                      )}
                    >
                      {card.tag && (
                        <span className="mb-2 inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          {card.tag}
                        </span>
                      )}
                      <h3 className="mb-1.5 text-sm font-semibold">{card.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {card.body}
                      </p>
                      {card.items && (
                        <ul className="mt-3 space-y-1.5">
                          {card.items.map((item, ii) => (
                            <li key={ii} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Steps */}
              {section.steps && (
                <ol className="space-y-3">
                  {section.steps.map((step, sti) => (
                    <li key={sti} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-xs font-semibold text-green-600 dark:text-green-400">
                        {sti + 1}
                      </span>
                      <span className="text-sm leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
