"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard, type CourseItem } from "@/components/site/course-card";
import { ScribbleUnderline } from "@/components/site/illustrations";
import { cn } from "@/lib/utils";

const CATEGORIES = ["全部", "小白", "爆款", "精选"];
const LEVELS = ["全部", "初级", "中级", "高级"];

export function CoursesView() {
  const [category, setCategory] = React.useState("全部");
  const [level, setLevel] = React.useState("全部");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [courses, setCourses] = React.useState<CourseItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (category !== "全部") params.set("category", category);
    if (level !== "全部") params.set("level", level);
    if (search) params.set("search", search);

    setLoading(true);
    fetch(`/api/courses?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setCourses(Array.isArray(d.courses) ? d.courses : []);
      })
      .catch(() => {
        if (cancelled) return;
        setCourses([]);
        toast.error("课程加载失败，请稍后重试");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, level, search]);

  const hasActiveFilters = category !== "全部" || level !== "全部" || search !== "";

  function clearFilters() {
    setCategory("全部");
    setLevel("全部");
    setSearchInput("");
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 code-bg opacity-30" aria-hidden="true" />

      <div className="container-page relative pt-12 pb-20 lg:pt-16">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="text-sm font-medium text-muted-foreground">
            课程中心 · 三阶段课程目录
          </div>
          <h1 className="font-display mt-3 text-balance text-[40px] font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-[60px]">
            <span className="relative inline-block">
              选阶段
              <ScribbleUnderline className="absolute -bottom-1 left-0 right-0 text-amber-400/85" />
            </span>
            ，再开始写
          </h1>
          <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            课程按小白、爆款、精选三阶段展开，每节课对应生成器里的同一套方法。
          </p>
        </motion.div>

        {/* Filter panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mt-10 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-3 text-sm text-muted-foreground">
            <span className="font-medium">筛选条件</span>
            <span className="text-xs">
              {loading ? "加载中…" : `${courses.length} 门课程`}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-3 inline-flex items-center gap-1 text-foreground/80 hover:text-green-600 dark:hover:text-green-400"
                >
                  <X className="h-3 w-3" /> 清空
                </button>
              )}
            </span>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <FilterRow label="阶段">
              {CATEGORIES.map((item) => (
                <Chip
                  key={item}
                  active={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </Chip>
              ))}
            </FilterRow>

            <FilterRow label="难度">
              {LEVELS.map((item) => (
                <Chip
                  key={item}
                  active={level === item}
                  onClick={() => setLevel(item)}
                >
                  {item}
                </Chip>
              ))}
            </FilterRow>
          </div>
        </motion.div>

        {/* Course grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/2] w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : courses.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-20 text-center">
              <div className="text-sm text-muted-foreground">
                没找到匹配课程
              </div>
              <p className="font-display mt-3 text-[24px] font-bold tracking-tight">
                试试换个阶段、难度或关键词
              </p>
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-6 gap-1.5 rounded-lg"
                >
                  <X className="h-3.5 w-3.5" />
                  清空全部筛选
                </Button>
              ) : null}
            </div>
          ) : (
            courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
              >
                <CourseCard course={course} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <div className="text-xs font-medium text-muted-foreground sm:w-14 sm:shrink-0">
        {label}
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-all",
        active
          ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
          : "border-border/50 bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
