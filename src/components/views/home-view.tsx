"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Type as TypeIcon,
  Zap,
  Mic,
  PlayCircle,
  ArrowRight,
  Award,
  Film,
  Brain,
  Target,
  Rocket,
  Wrench,
  MessageCircle,
  TrendingUp,
  Cpu,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseCard, type CourseItem } from "@/components/site/course-card";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { StudioLight, FilmShoulder } from "@/components/site/illustrations";

// 平台工具卡片配置（静态 UI 内容）
const AI_TOOLS = [
  {
    icon: Sparkles,
    title: "AI 独家文案生成",
    desc: "输入电影信息与风格参数，10分钟产出结构完整的爆款解说文案，黄金3秒开头+高密度反转+互动金句结尾。",
    color: "from-rose-500 to-pink-500",
    view: "script-generator" as const,
  },
  {
    icon: TypeIcon,
    title: "爆款标题生成器",
    desc: "六大爆款标题公式，批量产出悬念型/反差型/数字型标题，告别想标题想到头秃。",
    color: "from-amber-500 to-orange-500",
    view: "tools" as const,
  },
  {
    icon: Zap,
    title: "黄金3秒开头",
    desc: "3秒决定生死，5种钩子类型专属生成，一句话把观众死死钉在屏幕上。",
    color: "from-fuchsia-500 to-rose-500",
    view: "tools" as const,
  },
  {
    icon: Wand2,
    title: "文案润色神器",
    desc: "把平淡文案改造成爆款，增强转折词、画面感、情绪张力，让AI文案有人味。",
    color: "from-emerald-500 to-teal-500",
    view: "tools" as const,
  },
];

// 四步学习路径配置（静态 UI 内容）
const STEPS = [
  {
    icon: Target,
    step: "01",
    title: "定位赛道",
    desc: "用「人群×情绪×风格」三角定位法，找到你的差异化解说人设。",
    color: "from-rose-500 to-pink-500",
    tag: "破冰·第1步",
    view: "courses" as const,
  },
  {
    icon: Brain,
    step: "02",
    title: "AI生成文案",
    desc: "调用平台AI工具，10分钟产出独家精选解说文案、爆款标题、黄金开头。",
    color: "from-amber-500 to-orange-500",
    tag: "AI文案工具",
    view: "script-generator" as const,
  },
  {
    icon: Mic,
    step: "03",
    title: "配音剪辑",
    desc: "手机也能配出电影级声线，3分钟剪出节奏感，声画双修出质感。",
    color: "from-fuchsia-500 to-rose-500",
    tag: "配音剪辑·第3-6步",
    view: "courses" as const,
  },
  {
    icon: Rocket,
    step: "04",
    title: "发布变现",
    desc: "标题封面标签流量密码+多元变现路径，跑通商业闭环。",
    color: "from-emerald-500 to-teal-500",
    tag: "运营变现",
    view: "courses" as const,
  },
];

// 为什么选择我们 — 图标卡片配置（静态 UI 内容）
const WHY_CHOOSE_ITEMS = [
  {
    icon: Cpu,
    title: "AI 工具自研",
    desc: "自主研发，持续迭代，永久免费给学员使用",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: Film,
    title: "真实操盘经验",
    desc: "课程内容源自真实千万播放，非纸上谈兵",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Layers,
    title: "6大创作工具",
    desc: "覆盖文案、标题、开头、润色、配音全链路",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: MessageCircle,
    title: "社群答疑",
    desc: "社群答疑 + 1对1点评，确保每个学员都能出爆款",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: TrendingUp,
    title: "多元变现",
    desc: "把内容能力转化为真金白银，从流量到收益",
    color: "from-violet-500 to-purple-500",
  },
];

export function HomeView() {
  const { setView } = useAppStore();
  const [courses, setCourses] = React.useState<CourseItem[]>([]);

  React.useEffect(() => {
    fetch("/api/courses?featured=1&limit=4")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses || []))
      .catch(() => {});
  }, []);

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-cinema-radial" />
        <div className="absolute inset-0 bg-grid-faint opacity-40" />
        {/* 浮光粒子效果 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-green-500/8 blur-[100px] animate-pulse" />
          <div className="absolute right-1/4 bottom-1/3 h-48 w-48 rounded-full bg-accent/8 blur-[80px] animate-pulse [animation-delay:1.5s]" />
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/5 blur-[60px] animate-pulse [animation-delay:3s]" />
        </div>
        {/* Hero bg image */}
        <div className="pointer-events-none absolute inset-0">
          <img
            src="/covers/hero-bg.png"
            alt=""
            className="h-full w-full object-cover opacity-25"
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-28">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
            {/* 左侧：文字 */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Badge className="mb-5 gap-1.5 border-green-500/30 bg-green-500/10 px-3 py-1 text-green-600 dark:text-green-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI 驱动 · 抖音电影解说创作平台
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
              >
                用 <span className="text-gradient-primary">AI 生成独家精选文案</span>
                <br />
                做出百万播放的电影解说
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
              >
                专注抖音电影解说创作教学。系统课程 + AI
                智能文案工具链，从选片定位到发布变现，让每一位创作者都能跑通属于自己的爆款路径。
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
              >
                <Button
                  size="lg"
                  onClick={() => setView("script-generator")}
                  className="group h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 px-7 text-base text-white shadow-glow-primary"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  立即体验 AI 文案生成
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setView("courses")}
                  className="h-12 rounded-full px-7 text-base"
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  浏览全部课程
                </Button>
              </motion.div>
            </div>

            {/* 右侧：视觉 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="hidden flex-1 lg:block"
            >
              <div className="relative">
                {/* 装饰：右上吊灯 */}
                <div className="absolute -top-5 -right-3 z-10">
                  <StudioLight className="h-16 w-16 text-accent/40" />
                </div>
                {/* 图片卡片 */}
                <div className="relative overflow-hidden rounded-xl border-2 border-border bg-card p-2 shadow-glow-primary">
                  <img
                    src="/covers/hero-bg.png"
                    alt=""
                    className="w-full rounded-lg object-cover"
                  />
                  {/* 底部胶片装饰条 */}
                  <div className="absolute inset-x-0 bottom-0">
                    <FilmShoulder className="text-primary/20" />
                  </div>
                </div>
                {/* 角落光效 */}
                <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-gradient-to-tr from-green-500/5 via-transparent to-accent/5 blur-2xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI TOOLS SHOWCASE */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="核心特色"
          icon={Sparkles}
          title="AI 创作工具箱"
          subtitle="自己开发的辅助创作工具链，把单条文案产出时间从 2 小时压到 10 分钟"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AI_TOOLS.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card
                onClick={() => setView(tool.view)}
                className="group h-full cursor-pointer overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-primary"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} shadow-lg`}
                >
                  <tool.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 font-semibold">{tool.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tool.desc}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-green-600 dark:text-green-400 opacity-0 transition-opacity group-hover:opacity-100">
                  立即使用
                  <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="relative overflow-hidden bg-card/30 py-16 lg:py-24">
        {/* 背景装饰 */}
        <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-20" />
        <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-green-500/5 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading
              eyebrow="精选课程"
              icon={Film}
              title="从入门到高阶的系统课"
              subtitle="每节课都源自真实操盘经验，学完就能直接落地"
              align="left"
            />
            <Button
              variant="ghost"
              onClick={() => setView("courses")}
              className="hidden shrink-0 sm:inline-flex"
            >
              查看全部
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="mt-10 grid justify-center gap-6 sm:grid-cols-2">
            {courses.length > 0 ? (
              courses.map((c) => (
                <div key={c.id} className="max-w-lg">
                  <CourseCard course={c} />
                </div>
              ))
            ) : (
              Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[420px] animate-pulse rounded-xl bg-muted/40"
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="学习路径"
          icon={Target}
          title="四步跑通爆款闭环"
          subtitle="清晰的成长路径，每一步都有对应课程和工具支撑"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative"
            >
              <Card
                onClick={() => setView(s.view)}
                className="group h-full cursor-pointer p-6 transition-all hover:-translate-y-1 hover:border-green-500/30 hover:shadow-glow-primary"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", s.color)}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="text-3xl font-bold text-muted/30 transition-colors group-hover:text-green-600 dark:text-green-400/30">
                    {s.step}
                  </span>
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400 opacity-70 transition-opacity group-hover:opacity-100">
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5">{s.tag}</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Card>
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted/40 lg:block" />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="relative bg-card/30 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="为什么选择我们"
            icon={Award}
            title="不止教方法，更给你工具"
            subtitle="市面上教电影解说的很多，但很少有平台同时提供 AI 创作工具链"
          />
          <div className="mt-12 grid gap-4 [grid-template-columns:repeat(5,minmax(0,1fr))]">
            {WHY_CHOOSE_ITEMS.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className="group flex flex-col items-center text-center gap-2 rounded-xl border bg-card p-3 transition-all hover:-translate-y-1 hover:shadow-glow-primary">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                      item.color
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-snug">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <Button
            size="lg"
            onClick={() => setView("courses")}
            className="mt-10 h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 px-7 text-white"
          >
            开始系统学习
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-cinema-radial" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            现在就开始你的{" "}
            <span className="text-gradient-primary">第一个百万播放</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            免费体验 AI 文案生成工具，感受 10 分钟产出爆款解说文案的效率革命。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => setView("auth")}
              className="h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 px-8 text-base text-white shadow-glow-primary"
            >
              免费注册开始
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("tools")}
              className="h-12 rounded-full px-8 text-base"
            >
              探索创作工具
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div
        className={
          align === "center"
            ? "mb-3 flex items-center justify-center gap-2"
            : "mb-3 flex items-center gap-2"
        }
      >
        <Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-green-600 dark:text-green-400">{eyebrow}</span>
      </div>
      <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
    </div>
  );
}
