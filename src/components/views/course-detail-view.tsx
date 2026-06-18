"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Star,
  Users,
  Clock,
  PlayCircle,
  CheckCircle2,
  ChevronDown,
  Lock,
  Heart,
  Share2,
  Crown,
  GraduationCap,
  Award,
  BarChart3,
  Sparkles,
  Loader2,
  Video,
  Bot,
  Send,
  MessageSquare,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string | null;
  duration: number;
  order: number;
  isPreview: boolean;
}

interface CourseDetail {
  id: string;
  title: string;
  subtitle?: string | null;
  description: string;
  coverImage: string;
  category: string;
  level: string;
  price: number;
  originalPrice?: number | null;
  isFree: boolean;
  isFeatured: boolean;
  instructor: string;
  instructorBio?: string | null;
  instructorAvatar?: string | null;
  rating: number;
  ratingCount: number;
  studentsCount: number;
  totalDuration: number;
  lessonsCount: number;
  tags: string;
  highlights: string;
}

interface Enrollment {
  id: string;
  progress: number;
  lastLessonId?: string | null;
}

const LEVEL_STYLE: Record<string, string> = {
  初级: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  中级: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  高级: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

function safeParseArr(raw: string): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function CourseDetailView() {
  const selectedCourseId = useAppStore((s) => s.selectedCourseId);
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);

  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = React.useState<Enrollment | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [enrolling, setEnrolling] = React.useState(false);
  const [favorited, setFavorited] = React.useState(false);

  const fetchCourse = React.useCallback(async () => {
    if (!selectedCourseId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${selectedCourseId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("课程加载失败");
      const data = (await res.json()) as { course: CourseDetail & { lessons: Lesson[] }; enrollment: Enrollment | null };
      setCourse(data.course);
      setLessons(data.course.lessons || []);
      setEnrollment(data.enrollment);
      // 自动展开首个试看课
      const firstPreview = (data.course.lessons || []).find((l) => l.isPreview);
      if (firstPreview) setExpandedId(firstPreview.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "课程加载失败");
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  React.useEffect(() => {
    void fetchCourse();
  }, [fetchCourse]);

  const handleEnroll = async () => {
    if (!course) return;
    if (!user) {
      toast.info("请先登录后再报名", {
        description: "登录后即可报名学习全部课程",
        action: { label: "去登录", onClick: () => setView("auth") },
      });
      return;
    }
    if (enrollment) return;
    setEnrolling(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "报名失败");
      }
      const data = (await res.json()) as { enrollment: Enrollment; already?: boolean };
      setEnrollment(data.enrollment);
      toast.success("报名成功！", {
        description: data.already ? "你之前已报名，继续学习吧" : "现在可以学习全部课程内容",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "报名失败");
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (lesson.isPreview || enrollment) {
      setExpandedId((cur) => (cur === lesson.id ? null : lesson.id));
      return;
    }
    toast.info("该课时需要报名后学习", {
      description: "报名课程即可解锁全部课时内容",
      action: { label: "立即报名", onClick: handleEnroll },
    });
  };

  // 未选择课程
  if (!selectedCourseId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <PlayCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">未选择课程</h2>
          <p className="mt-1 text-sm text-muted-foreground">请从课程中心选择一门课程查看详情</p>
        </div>
        <Button onClick={() => setView("courses")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          返回课程中心
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="pointer-events-none absolute inset-0 bg-cinema-radial" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* 返回按钮 */}
        <Button variant="ghost" size="sm" className="mb-5 gap-1.5" onClick={() => setView("courses")}>
          <ArrowLeft className="h-4 w-4" />
          返回课程中心
        </Button>

        {loading || !course ? (
          <DetailSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              {/* 左栏 */}
              <div className="space-y-6 lg:col-span-2">
                {/* 封面 */}
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
                  { }
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  {/* 顶部徽章 */}
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <Badge className="bg-primary/90 text-primary-foreground">{course.category}</Badge>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium backdrop-blur",
                        LEVEL_STYLE[course.level] || "bg-muted text-muted-foreground"
                      )}
                    >
                      {course.level}
                    </span>
                    {course.isFeatured && (
                      <Badge className="gap-1 bg-accent/90 text-accent-foreground">
                        <Crown className="h-3 w-3" />
                        精选
                      </Badge>
                    )}
                  </div>
                  {/* 底部标题 */}
                  <div className="absolute inset-x-5 bottom-5">
                    <h1 className="text-balance text-2xl font-extrabold leading-tight text-white drop-shadow-lg sm:text-3xl">
                      {course.title}
                    </h1>
                    {course.subtitle && (
                      <p className="mt-2 line-clamp-2 text-sm text-white/80 sm:text-base">
                        {course.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* 讲师信息卡 */}
                <Card className="glass-card flex items-center gap-4 p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent text-lg font-bold text-primary-foreground">
                    {course.instructorAvatar ? (
                       
                      <img src={course.instructorAvatar} alt={course.instructor} className="h-full w-full object-cover" />
                    ) : (
                      course.instructor.slice(0, 1)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                      <span className="font-semibold">{course.instructor}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {course.instructorBio || "资深电影解说创作者，专注抖音影视赛道多年"}
                    </p>
                  </div>
                </Card>

                {/* 课程描述 */}
                <Card className="p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    课程介绍
                  </h2>
                  <p className="whitespace-pre-line text-sm leading-7 text-foreground/85">
                    {course.description}
                  </p>
                </Card>

                {/* 课程亮点 */}
                {safeParseArr(course.highlights).length > 0 && (
                  <Card className="p-5">
                    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                      <Award className="h-4 w-4 text-accent" />
                      课程亮点
                    </h2>
                    <ul className="grid gap-2.5 sm:grid-cols-2">
                      {safeParseArr(course.highlights).map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="text-foreground/85">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* 课程目录 */}
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border/60 p-5">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                      <PlayCircle className="h-4 w-4 text-primary" />
                      课程目录
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      共 {lessons.length} 节 · 已报可学全部
                    </span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {lessons.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        暂无课时
                      </div>
                    ) : (
                      lessons.map((lesson, idx) => (
                        <LessonRow
                          key={lesson.id}
                          lesson={lesson}
                          index={idx}
                          enrolled={!!enrollment}
                          expanded={expandedId === lesson.id}
                          onClick={() => handleLessonClick(lesson)}
                          courseTitle={course?.title || ""}
                        />
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* 右栏 sticky */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-6 space-y-4">
                  {/* 报名卡 */}
                  <Card className="glass-card overflow-hidden">
                    <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 to-accent/10 p-5">
                      {enrollment ? (
                        <div>
                          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            已报名
                          </div>
                          <div className="mb-3">
                            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                              <span>学习进度</span>
                              <span className="font-semibold text-primary">
                                {Math.round(enrollment.progress)}%
                              </span>
                            </div>
                            <Progress value={enrollment.progress} className="h-2" />
                          </div>
                          <Button
                            className="h-11 w-full gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow-primary"
                            onClick={() => {
                              const next = lessons.find((l) => l.id === enrollment.lastLessonId) || lessons[0];
                              if (next) {
                                setExpandedId(next.id);
                                document.getElementById(`lesson-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                              }
                            }}
                          >
                            <PlayCircle className="h-4 w-4" />
                            继续学习
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-1 flex items-baseline gap-2">
                            {course.isFree ? (
                              <span className="text-3xl font-extrabold text-emerald-600">免费</span>
                            ) : (
                              <>
                                <span className="text-3xl font-extrabold text-primary">¥{course.price}</span>
                                {course.originalPrice && course.originalPrice > course.price && (
                                  <span className="text-sm text-muted-foreground line-through">
                                    ¥{course.originalPrice}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {!course.isFree && course.originalPrice && course.originalPrice > course.price && (
                            <p className="mb-3 text-xs text-accent">
                              限时立省 ¥{Math.round(course.originalPrice - course.price)}
                            </p>
                          )}
                          <Button
                            className="h-11 w-full gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow-primary"
                            onClick={handleEnroll}
                            disabled={enrolling}
                          >
                            {enrolling ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                报名中…
                              </>
                            ) : (
                              <>
                                <Crown className="h-4 w-4" />
                                立即报名
                              </>
                            )}
                          </Button>
                          <p className="mt-2 text-center text-[11px] text-muted-foreground">
                            报名后永久有效 · 随时回看
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 课程信息 */}
                    <div className="space-y-2.5 p-5">
                      <InfoRow
                        icon={Star}
                        label="评分"
                        value={
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-accent">{course.rating.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({course.ratingCount})</span>
                          </span>
                        }
                      />
                      <InfoRow
                        icon={Users}
                        label="学员数"
                        value={<span className="font-semibold">{course.studentsCount.toLocaleString()} 人</span>}
                      />
                      <InfoRow
                        icon={PlayCircle}
                        label="课时数"
                        value={<span className="font-semibold">{course.lessonsCount} 节</span>}
                      />
                      <InfoRow
                        icon={Clock}
                        label="总时长"
                        value={
                          <span className="font-semibold">
                            {Math.floor(course.totalDuration / 60) > 0 && `${Math.floor(course.totalDuration / 60)} 小时 `}
                            {course.totalDuration % 60 > 0 && `${course.totalDuration % 60} 分`}
                            {course.totalDuration === 0 && "—"}
                          </span>
                        }
                      />
                      <InfoRow
                        icon={BarChart3}
                        label="难度"
                        value={<span className="font-semibold">{course.level}</span>}
                      />
                    </div>

                    {/* 标签 */}
                    {safeParseArr(course.tags).length > 0 && (
                      <div className="border-t border-border/60 p-5">
                        <p className="mb-2 text-xs text-muted-foreground">课程标签</p>
                        <div className="flex flex-wrap gap-1.5">
                          {safeParseArr(course.tags).map((t) => (
                            <span
                              key={t}
                              className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 分享 / 收藏 (装饰) */}
                    <div className="flex gap-2 border-t border-border/60 p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 flex-1 gap-1.5"
                        onClick={() => {
                          setFavorited((v) => !v);
                          toast.success(favorited ? "已取消收藏" : "已加入收藏");
                        }}
                      >
                        <Heart className={cn("h-4 w-4", favorited && "fill-primary text-primary")} />
                        {favorited ? "已收藏" : "收藏"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 flex-1 gap-1.5"
                        onClick={() => {
                          if (typeof navigator !== "undefined" && navigator.clipboard) {
                            void navigator.clipboard.writeText(window.location.href);
                          }
                          toast.success("链接已复制，快去分享给好友吧");
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                        分享
                      </Button>
                    </div>
                  </Card>

                  {/* 学习保障 */}
                  <Card className="p-4">
                    <p className="mb-2.5 text-xs font-semibold text-muted-foreground">学习保障</p>
                    <ul className="space-y-1.5 text-xs text-foreground/75">
                      {["报名后永久回看", "社群答疑 + 1对1点评", "学完即可产出实战作品", "AI 创作工具免费用"].map((t) => (
                        <li key={t} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ---------- 子组件 ---------- */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {value}
    </div>
  );
}

function LessonRow({
  lesson,
  index,
  enrolled,
  expanded,
  onClick,
  courseTitle,
}: {
  lesson: Lesson;
  index: number;
  enrolled: boolean;
  expanded: boolean;
  onClick: () => void;
  courseTitle: string;
}) {
  const locked = !lesson.isPreview && !enrolled;
  return (
    <div id={`lesson-${lesson.id}`} className="scroll-mt-6">
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium",
            lesson.isPreview
              ? "bg-primary/10 text-primary"
              : locked
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
          )}
        >
          {locked ? <Lock className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{lesson.title}</span>
            {lesson.isPreview && (
              <Badge variant="secondary" className="shrink-0 bg-accent/15 text-[10px] text-accent">
                试看
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>第 {index + 1} 节</span>
            {lesson.duration > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {lesson.duration} 分钟
                </span>
              </>
            )}
            {lesson.videoUrl && (
              <span className="flex items-center gap-0.5">
                <Video className="h-3 w-3" />
                视频
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="border-t border-border/40 bg-muted/20 px-4 py-3">
            <p className="whitespace-pre-line text-xs leading-6 text-foreground/75">
              {lesson.content || "本节暂无文字内容"}
            </p>
            {lesson.videoUrl && (
              <div className="mt-3">
                <video src={lesson.videoUrl} controls className="w-full rounded-md" />
              </div>
            )}
            {/* AI 助教 */}
            {!locked && <LessonAssistant lesson={lesson} courseTitle={courseTitle} />}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/** 课时 AI 助教：基于课时内容回答学员疑问 */
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "这节课的核心要点是什么？",
  "能举个具体例子吗？",
  "新手最容易踩什么坑？",
  "这步操作有哪些注意事项？",
];

function LessonAssistant({
  lesson,
  courseTitle,
}: {
  lesson: Lesson;
  courseTitle: string;
}) {
  const { user } = useAppStore();
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // 打开时加载历史对话（持久化）
  React.useEffect(() => {
    if (!open || !user || !lesson.id) return;
    fetch(`/api/ai/assistant?lessonId=${lesson.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.messages?.length) {
          setMessages(
            d.messages.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        }
      })
      .catch(() => {});
  }, [open, user, lesson.id]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || loading) return;
    if (!user) {
      toast.info("请先登录后使用 AI 助教", {
        description: "登录即可免费向助教提问",
      });
      return;
    }
    const newMsgs: ChatMsg[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonContent: lesson.content,
          courseTitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "回答失败");
      setMessages([...newMsgs, { role: "assistant", content: data.answer }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "助教回答失败");
    } finally {
      setLoading(false);
    }
  };

  const [clearing, setClearing] = React.useState(false);
  const handleClearHistory = async () => {
    if (!user || !lesson.id) return;
    setClearing(true);
    try {
      const res = await fetch(
        `/api/ai/assistant?lessonId=${lesson.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "清除失败");
      setMessages([]);
      toast.success(
        data.deleted > 0
          ? `已清除 ${data.deleted} 条历史对话`
          : "本课时暂无历史对话"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "清除历史失败");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] p-3">
      {/* 助教标题栏 */}
      <div className="flex w-full items-center gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">AI 课程助教</p>
            <p className="text-[10px] text-muted-foreground">
              基于本节内容，有疑问随时问
            </p>
          </div>
          {open ? (
            <X className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {open && messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={clearing}
                className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                title="清空本课时的对话历史"
              >
                {clearing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">
                  {clearing ? "清除中" : "清除历史"}
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>清除本课时的对话历史？</AlertDialogTitle>
                <AlertDialogDescription>
                  将永久删除你在《{lesson.title}》与 AI 助教的所有对话（共 {messages.length} 条），此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={clearing}>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearHistory}
                  disabled={clearing}
                  className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {clearing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  确认清除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          {/* 对话区 */}
          {messages.length > 0 && (
            <div
              ref={scrollRef}
              className="scrollbar-thin mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    m.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]",
                      m.role === "user"
                        ? "bg-muted text-muted-foreground"
                        : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                    )}
                  >
                    {m.role === "user" ? "我" : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border/60 text-foreground/85"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                    <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-1 rounded-xl bg-card border border-border/60 px-3 py-2.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 快捷问题 */}
          {messages.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  disabled={loading}
                  className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* 输入区 */}
          <div className="mt-3 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              placeholder="向助教提问本节内容…"
              className="min-h-[40px] resize-none text-xs"
              rows={1}
              disabled={loading}
            />
            <Button
              size="sm"
              onClick={() => ask(input)}
              disabled={loading || !input.trim()}
              className="h-9 shrink-0 gap-1 rounded-lg bg-gradient-to-r from-primary to-accent px-2.5 text-primary-foreground"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}
