"use client";

import { Star, Users, Clock, PlayCircle, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export interface CourseItem {
  id: string;
  title: string;
  subtitle?: string | null;
  coverImage: string;
  category: string;
  level: string;
  price: number;
  originalPrice?: number | null;
  isFree: boolean;
  isFeatured: boolean;
  instructor: string;
  rating: number;
  ratingCount: number;
  studentsCount: number;
  totalDuration: number;
  lessonsCount: number;
  tags?: string;
  _count?: { lessons: number; enrollments: number };
  isEnrolled?: boolean;
}

const LEVEL_STYLE: Record<string, string> = {
  初级: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  中级: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  高级: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export function CourseCard({ course }: { course: CourseItem }) {
  const openCourse = useAppStore((s) => s.openCourse);

  let tags: string[] = [];
  try {
    tags = JSON.parse(course.tags || "[]");
  } catch {}

  const durationH = Math.floor(course.totalDuration / 60);
  const durationM = course.totalDuration % 60;

  return (
    <Card
      onClick={() => openCourse(course.id)}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-primary"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
        { }
        <img
          src={course.coverImage}
          alt={course.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge className="bg-primary/90 text-primary-foreground shadow">
            {course.category}
          </Badge>
          {course.isFeatured && (
            <Badge className="bg-accent/90 text-accent-foreground shadow">
              <Crown className="mr-1 h-3 w-3" />
              精选
            </Badge>
          )}
        </div>

        {/* Level */}
        <div className="absolute right-3 top-3">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-medium backdrop-blur",
              LEVEL_STYLE[course.level] || "bg-muted text-muted-foreground"
            )}
          >
            {course.level}
          </span>
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg backdrop-blur">
            <PlayCircle className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>

        {/* Bottom info on cover */}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-white/90">
          <span className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span className="font-semibold">{course.rating.toFixed(1)}</span>
            <span className="text-white/60">({course.ratingCount})</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            <Users className="h-3.5 w-3.5" />
            {(course._count?.enrollments ?? 0).toLocaleString()}人学过
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col space-y-2.5 p-4">
        <h3 className="line-clamp-1 font-semibold leading-snug transition-colors group-hover:text-primary">
          {course.title}
        </h3>
        {course.subtitle && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {course.subtitle}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <PlayCircle className="h-3 w-3" />
            {course.lessonsCount}节
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {durationH > 0 ? `${durationH}小时` : ""}
            {durationM > 0 ? `${durationM}分` : ""}
          </span>
        </div>

        {/* Instructor + Price */}
        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
          <span className="truncate text-xs text-muted-foreground">
            {course.instructor}
          </span>
          {course.isEnrolled ? (
            <Badge variant="secondary" className="text-emerald-600">
              已报名
            </Badge>
          ) : course.isFree ? (
            <span className="text-base font-bold text-emerald-600">免费</span>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-primary">
                ¥{course.price}
              </span>
              {course.originalPrice && (
                <span className="text-[11px] text-muted-foreground line-through">
                  ¥{course.originalPrice}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
