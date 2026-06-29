"use client";

import * as React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Crown,
  Users,
  BookOpen,
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon,
  Star,
  ListChecks,
  ChevronUp,
  ChevronDown,
  BarChart3,
  ClipboardCheck,
  Activity,
  Layers,
  GraduationCap,
  BookCheck,
  Search,
  Cloud,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Minus,
  Cpu,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthorizationTab } from "@/components/admin/authorization-tab";
import { FenggeConfigTab } from "@/components/admin/fengge-config-tab";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface AdminCourse {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  coverImage: string;
  category: string;
  level: string;
  price: number;
  originalPrice: number | null;
  isFree: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  instructor: string;
  instructorBio: string | null;
  tags: string;
  highlights: string;
  studentsCount: number;
  _count?: { lessons: number; enrollments: number };
}

interface CourseFormState {
  title: string;
  subtitle: string;
  description: string;
  coverImage: string;
  category: string;
  level: string;
  price: string;
  originalPrice: string;
  isFree: boolean;
  isFeatured: boolean;
  instructor: string;
  instructorBio: string;
  tags: string;
  highlights: string;
}

const EMPTY_FORM: CourseFormState = {
  title: "",
  subtitle: "",
  description: "",
  coverImage: "/covers/course-1.png",
  category: "实战",
  level: "中级",
  price: "0",
  originalPrice: "",
  isFree: false,
  isFeatured: false,
  instructor: "",
  instructorBio: "",
  tags: "",
  highlights: "",
};

const CATEGORIES = ["入门", "进阶", "实战", "高阶", "运营"];
const LEVELS = ["初级", "中级", "高级"];
const COVER_PRESETS = [
  "/covers/course-1.png",
  "/covers/course-2.png",
  "/covers/course-3.png",
  "/covers/course-4.png",
  "/covers/course-5.png",
  "/covers/course-6.png",
];

const LEVEL_STYLE: Record<string, string> = {
  初级: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  中级: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  高级: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

function courseToForm(c: AdminCourse): CourseFormState {
  let tagsArr: string[] = [];
  let highlightsArr: string[] = [];
  try {
    tagsArr = JSON.parse(c.tags || "[]");
  } catch {
    tagsArr = [];
  }
  try {
    highlightsArr = JSON.parse(c.highlights || "[]");
  } catch {
    highlightsArr = [];
  }
  return {
    title: c.title || "",
    subtitle: c.subtitle || "",
    description: c.description || "",
    coverImage: c.coverImage || COVER_PRESETS[0],
    category: c.category || "实战",
    level: c.level || "中级",
    price: String(c.price ?? 0),
    originalPrice:
      c.originalPrice != null ? String(c.originalPrice) : "",
    isFree: !!c.isFree,
    isFeatured: !!c.isFeatured,
    instructor: c.instructor || "",
    instructorBio: c.instructorBio || "",
    tags: Array.isArray(tagsArr) ? tagsArr.join(", ") : "",
    highlights: Array.isArray(highlightsArr)
      ? highlightsArr.join("\n")
      : "",
  };
}

function formToBody(form: CourseFormState) {
  return {
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || null,
    description: form.description.trim(),
    coverImage: form.coverImage,
    category: form.category,
    level: form.level,
    price: Number(form.price) || 0,
    originalPrice: form.originalPrice.trim()
      ? Number(form.originalPrice)
      : null,
    isFree: form.isFree,
    isFeatured: form.isFeatured,
    instructor: form.instructor.trim() || "荒哥说电影导师",
    instructorBio: form.instructorBio.trim() || null,
    tags: form.tags
      .split(/[，,]/)
      .map((t) => t.trim())
      .filter(Boolean),
    highlights: form.highlights
      .split(/\n/)
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

export function AdminView() {
  const { user, setView } = useAppStore();
  const [courses, setCourses] = React.useState<AdminCourse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CourseFormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminCourse | null>(
    null
  );
  const [deleting, setDeleting] = React.useState(false);
  // 课时管理
  const [lessonsCourse, setLessonsCourse] = React.useState<AdminCourse | null>(null);

  const fetchCourses = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/courses?limit=100");
      const data = await res.json();
      setCourses(data.courses || []);
    } catch {
      toast.error("加载课程列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchCourses();
    } else {
      setLoading(false);
    }
  }, [user, fetchCourses]);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="relative min-h-[70vh] overflow-hidden">
        <div className="absolute inset-0 spotlight-soft opacity-60" />
        <div className="absolute inset-0 code-bg opacity-40" />
        <div className="container-page relative flex flex-col items-center justify-center pt-24 pb-20 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-destructive">
            / admin · 403 · forbidden
          </div>
          <h2 className="font-display mt-3 text-balance text-[36px] font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-[48px]">
            无访问权限
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            该页面仅限管理员访问，请使用管理员账号登录后重试。
          </p>
          <div className="mt-8 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setView("home")}
              className="rounded-[2px] font-mono text-[12px] uppercase tracking-[0.08em]"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              返回首页
            </Button>
            {!user && (
              <Button
                onClick={() => setView("auth")}
                className="rounded-[2px] font-mono text-[12px] uppercase tracking-[0.08em]"
              >
                去登录
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

      const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (c: AdminCourse) => {
    setForm(courseToForm(c));
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("请填写课程标题");
      return;
    }
    if (!form.description.trim()) {
      toast.error("请填写课程描述");
      return;
    }
    setSaving(true);
    try {
      const body = formToBody(form);
      const res = editingId
        ? await fetch(`/api/courses/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "保存失败");
        return;
      }
      toast.success(editingId ? "课程已更新" : "课程已创建");
      setDialogOpen(false);
      fetchCourses();
    } catch {
      toast.error("网络错误，保存失败");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "删除失败");
        return;
      }
      toast.success(`已删除「${deleteTarget.title}」`);
      setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    } catch {
      toast.error("网络错误，删除失败");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const stats = [
    {
      icon: BookOpen,
      label: "课程总数",
      value: String(courses.length),
      tint: "bg-rose-500/10 text-rose-500",
    },
    {
      icon: Users,
      label: "学员总数",
      value: "—",
      tint: "bg-amber-500/10 text-amber-500",
    },
    {
      icon: Layers,
      label: "课时总数",
      value: String(courses.reduce((s, c) => s + (c._count?.lessons ?? 0), 0)),
      tint: "bg-violet-500/10 text-violet-500",
    },
  ];

  return (
    <div className="relative min-h-[70vh]">
      <div className="absolute inset-x-0 top-0 h-64 spotlight-soft opacity-50" />
      <div className="absolute inset-0 code-bg opacity-40" />
      <div className="container-page relative pt-12 pb-20 lg:pt-16">
        {/* —— 页头 —— */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-amber-500 dark:text-amber-400">
              / admin · ROLE = ADMIN
            </div>
            <h1 className="font-display mt-3 text-balance text-[36px] font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-[52px]">
              管理后台
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              管理平台所有课程内容、学员、报名审核与上架状态。
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="self-start rounded-[2px] font-mono text-[12px] uppercase tracking-[0.06em] sm:self-auto"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            新建课程
          </Button>
        </motion.div>

        {/* —— 统计行 —— */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-[2px] border border-border/70 bg-card/50 p-5"
            >
              <div className="flex items-center gap-2">
                <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {s.label}
                </span>
              </div>
              <div className="font-display mt-3 text-[32px] font-bold leading-none tracking-tight">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  s.value
                )}
              </div>
            </div>
          ))}
        </motion.div>

        {/* —— Tab 切换 —— */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mt-8"
        >
          <Tabs defaultValue="courses" className="w-full">
            <TabsList className="grid h-auto w-full max-w-2xl grid-cols-5 rounded-[2px] border border-border/70 bg-card/40 p-0.5">
              <TabsTrigger
                value="courses"
                className="gap-1.5 rounded-[2px] py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] data-[state=active]:bg-foreground/10"
              >
                <BookOpen className="h-3 w-3" />
                课程管理
              </TabsTrigger>
              <TabsTrigger
                value="students"
                className="gap-1.5 rounded-[2px] py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] data-[state=active]:bg-foreground/10"
              >
                <Users className="h-3 w-3" />
                学员管理
              </TabsTrigger>
              <TabsTrigger
                value="enrollments"
                className="gap-1.5 rounded-[2px] py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] data-[state=active]:bg-foreground/10"
              >
                <ClipboardCheck className="h-3 w-3" />
                报名审核
              </TabsTrigger>
              <TabsTrigger
                value="ai-models"
                className="gap-1.5 rounded-[2px] py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] data-[state=active]:bg-foreground/10"
              >
                <Cpu className="h-3 w-3" />
                AI 模型
              </TabsTrigger>
              <TabsTrigger
                value="authorization"
                className="gap-1.5 rounded-[2px] py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] data-[state=active]:bg-foreground/10"
              >
                <ShieldCheck className="h-3 w-3" />
                授权管理
              </TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="mt-4">
          <Card className="p-0">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle className="text-base">课程列表</CardTitle>
              <CardDescription className="text-xs">
                共 {courses.length} 门已发布课程
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-md bg-muted/40"
                    />
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    暂无课程，点击右上角「新建课程」开始添加
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[60px]">封面</TableHead>
                      <TableHead className="min-w-[180px]">标题</TableHead>
                      <TableHead className="min-w-[80px]">分类</TableHead>
                      <TableHead className="min-w-[80px]">难度</TableHead>
                      <TableHead className="min-w-[90px]">价格</TableHead>
                      <TableHead className="min-w-[70px]">学员</TableHead>
                      <TableHead className="min-w-[60px]">精选</TableHead>
                      <TableHead className="min-w-[120px] text-right">
                        操作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="relative h-10 w-14 overflow-hidden rounded-md bg-muted">
                            <img
                              src={c.coverImage}
                              alt={c.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[260px]">
                            <div className="truncate font-medium">
                              {c.title}
                            </div>
                            {c.subtitle && (
                              <div className="truncate text-[11px] text-muted-foreground">
                                {c.subtitle}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {c.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                              LEVEL_STYLE[c.level] ||
                                "bg-muted text-muted-foreground"
                            )}
                          >
                            {c.level}
                          </span>
                        </TableCell>
                        <TableCell>
                          {c.isFree ? (
                            <span className="text-sm font-semibold text-emerald-600">
                              免费
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-primary">
                              ¥{c.price}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {c.studentsCount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {c.isFeatured ? (
                            <Crown className="h-4 w-4 text-accent" />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setLessonsCourse(c)}
                              aria-label="管理课时"
                              title="管理课时"
                            >
                              <ListChecks className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(c)}
                              aria-label="编辑"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(c)}
                              aria-label="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            {/* 学员管理 Tab */}
            <TabsContent value="students" className="mt-4">
              <StudentsTab courses={courses} />
            </TabsContent>

            {/* 报名审核 Tab */}
            <TabsContent value="enrollments" className="mt-4">
              <EnrollmentsTab courses={courses} />
            </TabsContent>

            {/* AI 模型配置 Tab */}
            <TabsContent value="ai-models" className="mt-4">
              <AiModelsTab />
            </TabsContent>

            {/* 授权管理 Tab */}
            <TabsContent value="authorization" className="mt-4">
              <AuthorizationTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "编辑课程" : "新建课程"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "修改课程信息后点击保存"
                : "填写课程基本信息，提交后立即上架"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="f-title">
                标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="f-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="例如：抖音电影解说 · 从入门到精通"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <Label htmlFor="f-subtitle">副标题</Label>
              <Input
                id="f-subtitle"
                value={form.subtitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subtitle: e.target.value }))
                }
                placeholder="一句话点明课程卖点"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="f-desc">
                描述 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="f-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="详细介绍课程内容、适合人群、学习收获等"
                className="h-28 resize-none overflow-y-auto scrollbar-thin"
                rows={4}
              />
            </div>

            {/* Cover */}
            <div className="space-y-2">
              <Label>封面图</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {COVER_PRESETS.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, coverImage: url }))
                    }
                    className={cn(
                      "relative aspect-[4/3] overflow-hidden rounded-md border-2 transition-all",
                      form.coverImage === url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img
                      src={url}
                      alt={url}
                      className="h-full w-full object-cover"
                    />
                    {form.coverImage === url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                        <ImageIcon className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <Input
                value={form.coverImage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, coverImage: e.target.value }))
                }
                placeholder="或输入自定义封面 URL"
                className="text-xs"
              />
            </div>

            {/* Category + Level */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>难度</Label>
                <Select
                  value={form.level}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, level: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price + Original */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="f-price">价格 (¥)</Label>
                <Input
                  id="f-price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  disabled={form.isFree}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-orig">原价 (¥, 可选)</Label>
                <Input
                  id="f-orig"
                  type="number"
                  min="0"
                  value={form.originalPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, originalPrice: e.target.value }))
                  }
                  disabled={form.isFree}
                  placeholder="用于显示划线价"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="f-free" className="cursor-pointer">
                    免费课程
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    开启后价格自动置 0
                  </p>
                </div>
                <Switch
                  id="f-free"
                  checked={form.isFree}
                  onCheckedChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      isFree: v,
                      price: v ? "0" : f.price,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="f-featured" className="cursor-pointer">
                    <Star className="mr-1 inline h-3.5 w-3.5 text-accent" />
                    精选推荐
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    显示在首页精选区
                  </p>
                </div>
                <Switch
                  id="f-featured"
                  checked={form.isFeatured}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, isFeatured: v }))
                  }
                />
              </div>
            </div>

            {/* Instructor */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="f-instructor">讲师</Label>
                <Input
                  id="f-instructor"
                  value={form.instructor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, instructor: e.target.value }))
                  }
                  placeholder="例如：老陈 · 影视赛道千万粉博主"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-instructor-bio">讲师简介</Label>
                <Input
                  id="f-instructor-bio"
                  value={form.instructorBio}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      instructorBio: e.target.value,
                    }))
                  }
                  placeholder="一句话介绍讲师背景"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="f-tags">标签</Label>
              <Input
                id="f-tags"
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
                placeholder="逗号分隔，例如：悬疑, 爆款, 完播率"
              />
              <p className="text-[11px] text-muted-foreground">
                用中文或英文逗号分隔多个标签
              </p>
            </div>

            {/* Highlights */}
            <div className="space-y-2">
              <Label htmlFor="f-highlights">课程亮点</Label>
              <Textarea
                id="f-highlights"
                value={form.highlights}
                onChange={(e) =>
                  setForm((f) => ({ ...f, highlights: e.target.value }))
                }
                placeholder="每行一条，例如：&#10;AI 文案工具授权学员可用&#10;6 年赛道操盘经验沉淀"
                className="h-24 resize-none overflow-y-auto scrollbar-thin"
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground">
                每行一条亮点，会展示在课程详情页
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  保存中…
                </>
              ) : (
                <>{editingId ? "保存修改" : "创建课程"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              确认删除课程
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleteTarget?.title}」吗？该操作会同时删除其下所有课时与报名记录，且不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  删除中…
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 课时管理 Dialog */}
      {lessonsCourse && (
        <LessonsManager
          course={lessonsCourse}
          onClose={() => setLessonsCourse(null)}
        />
      )}
    </div>
  );
}

/* ----------------------- 课时管理组件 ----------------------- */

interface LessonItem {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
  duration: number;
  order: number;
  isPreview: boolean;
}

function LessonsManager({
  course,
  onClose,
}: {
  course: AdminCourse;
  onClose: () => void;
}) {
  const [lessons, setLessons] = React.useState<LessonItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingLesson, setEditingLesson] = React.useState<LessonItem | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [deleteLessonId, setDeleteLessonId] = React.useState<string | null>(null);

  const fetchLessons = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}/lessons`);
      const data = await res.json();
      setLessons(data.lessons || []);
    } catch {
      toast.error("加载课时失败");
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  React.useEffect(() => {
    void fetchLessons();
  }, [fetchLessons]);

  const handleMove = async (lesson: LessonItem, dir: -1 | 1) => {
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= lessons.length) return;
    const swap = lessons[newIdx];
    // 交换 order
    try {
      await Promise.all([
        fetch(`/api/lessons/${lesson.id}?id=${lesson.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: swap.order }),
        }),
        fetch(`/api/lessons/${swap.id}?id=${swap.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: lesson.order }),
        }),
      ]);
      void fetchLessons();
      toast.success("已调整顺序");
    } catch {
      toast.error("调整顺序失败");
    }
  };

  const handleDelete = async () => {
    if (!deleteLessonId) return;
    try {
      const res = await fetch(`/api/lessons/${deleteLessonId}?id=${deleteLessonId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setLessons((prev) => prev.filter((l) => l.id !== deleteLessonId));
      toast.success("课时已删除");
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleteLessonId(null);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            课时管理 · {course.title}
          </DialogTitle>
          <DialogDescription>
            共 {lessons.length} 节课时 · 可新增、编辑、排序、删除
          </DialogDescription>
        </DialogHeader>

        {/* 课时列表 */}
        <div className="max-h-[400px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
            ))
          ) : lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ListChecks className="mb-2 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">还没有课时，点击下方按钮添加第一节</p>
            </div>
          ) : (
            lessons.map((lesson, idx) => (
              <motion.div
                key={lesson.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-all hover:border-primary/30"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMove(lesson, -1)}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                    title="上移"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-center text-[10px] font-medium text-muted-foreground">
                    {idx + 1}
                  </span>
                  <button
                    onClick={() => handleMove(lesson, 1)}
                    disabled={idx === lessons.length - 1}
                    className="rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                    title="下移"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{lesson.title}</p>
                    {lesson.isPreview && (
                      <Badge variant="outline" className="shrink-0 text-[10px] text-emerald-600 dark:text-emerald-400">
                        试看
                      </Badge>
                    )}
                    {lesson.videoUrl && (
                      <Badge variant="outline" className="shrink-0 gap-0.5 text-[10px] text-primary">
                        <Cloud className="h-2.5 w-2.5" />
                        网盘
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {lesson.content ? lesson.content.replace(/[#*>`-]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) + (lesson.content.length > 80 ? "…" : "") : "（暂无内容）"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {lesson.duration > 0 ? `${lesson.duration} 分钟` : "未设时长"} · 顺序 {lesson.order}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingLesson(lesson);
                      setShowForm(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteLessonId(lesson.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* 添加 / 编辑表单 */}
        {showForm && (
          <LessonForm
            courseId={course.id}
            lesson={editingLesson}
            onSaved={() => {
              setShowForm(false);
              setEditingLesson(null);
              void fetchLessons();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingLesson(null);
            }}
          />
        )}

        {!showForm && (
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
            <Button
              onClick={() => {
                setEditingLesson(null);
                setShowForm(true);
              }}
              className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              新增课时
            </Button>
          </DialogFooter>
        )}

        {/* 删除确认 */}
        <AlertDialog open={!!deleteLessonId} onOpenChange={(v) => !v && setDeleteLessonId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除该课时？</AlertDialogTitle>
              <AlertDialogDescription>
                课时内容将永久删除，无法恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function LessonForm({
  courseId,
  lesson,
  onSaved,
  onCancel,
}: {
  courseId: string;
  lesson: LessonItem | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(lesson?.title || "");
  const [content, setContent] = React.useState(lesson?.content || "");
  const [videoUrl, setVideoUrl] = React.useState(lesson?.videoUrl || "");
  const [duration, setDuration] = React.useState(lesson?.duration || 0);
  const [isPreview, setIsPreview] = React.useState(lesson?.isPreview || false);
  const [saving, setSaving] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState(false);
  const contentRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("请填写课时标题");
      return;
    }
    setSaving(true);
    try {
      if (lesson) {
        // 更新
        const res = await fetch(`/api/lessons/${lesson.id}?id=${lesson.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content,
            videoUrl: videoUrl || null,
            duration: Number(duration) || 0,
            isPreview,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("课时已更新");
      } else {
        // 新建
        const res = await fetch(`/api/courses/${courseId}/lessons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content,
            videoUrl: videoUrl || null,
            duration: Number(duration) || 0,
            isPreview,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("课时已添加");
      }
      onSaved();
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {lesson ? "编辑课时" : "新增课时"}
        </p>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          取消
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">标题 *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：第1课｜认知篇：电影解说赛道的真实机会与陷阱"
          className="h-9"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">内容（讲义，支持 Markdown）</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={previewMode ? "ghost" : "secondary"}
              onClick={() => setPreviewMode(false)}
              className="h-6 px-2 text-[11px]"
            >
              编辑
            </Button>
            <Button
              type="button"
              size="sm"
              variant={previewMode ? "secondary" : "ghost"}
              onClick={() => setPreviewMode(true)}
              className="h-6 px-2 text-[11px]"
            >
              预览
            </Button>
          </div>
        </div>
        {/* Markdown 工具栏（仅编辑模式显示） */}
        {!previewMode && (
          <MarkdownToolbar textareaRef={contentRef} onChange={setContent} />
        )}
        {previewMode ? (
          <div className="lesson-preview h-[320px] overflow-y-auto scrollbar-thin rounded-md border border-border/60 bg-background/60 p-3 text-xs leading-6">
            {content.trim() ? (
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h3 className="mb-2 text-sm font-bold">{children}</h3>,
                  h2: ({ children }) => <h4 className="mb-2 text-sm font-bold">{children}</h4>,
                  h3: ({ children }) => <h5 className="mb-1.5 text-xs font-semibold">{children}</h5>,
                  p: ({ children }) => <p className="mb-2">{children}</p>,
                  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                  li: ({ children }) => <li>{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
                  blockquote: ({ children }) => (
                    <blockquote className="my-2 border-l-2 border-primary/40 bg-primary/5 px-3 py-1.5 italic">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">{children}</code>
                  ),
                  hr: () => <hr className="my-3 border-border/60" />,
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">暂无内容，切换到编辑模式开始填写…</p>
            )}
          </div>
        ) : (
          <Textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"课时详细内容，支持 Markdown 格式…\n\n例如：\n## 核心要点\n- 第一点\n- 第二点\n\n> 重点提示：…"}
            className="h-[320px] resize-none overflow-y-auto scrollbar-thin text-sm font-mono"
          />
        )}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{content.length} 字</span>
          <span>支持 # 标题 / - 列表 / **加粗** / &gt; 引用 / `代码`</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">百度网盘链接（可选）</Label>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://pan.baidu.com/s/xxxx?pwd=abcd"
            className="h-9 font-mono text-[11px]"
          />
          <p className="text-[10px] text-muted-foreground">
            支持带提取码的链接，自动解析展示
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">时长（分钟）</Label>
          <Input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="h-9"
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-md bg-background/60 p-2.5">
        <div>
          <p className="text-xs font-medium">设为试看课时</p>
          <p className="text-[10px] text-muted-foreground">未报名学员也可查看</p>
        </div>
        <Switch checked={isPreview} onCheckedChange={setIsPreview} />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={saving || !title.trim()}
        className="w-full gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {saving ? "保存中…" : lesson ? "保存修改" : "添加课时"}
      </Button>
    </motion.div>
  );
}


interface StudentItem {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  _count: {
    enrollments: number;
    scripts: number;
    lessonCompletions: number;
  };
  enrollment?: {
    progress: number;
    enrolledAt: string;
    completedAt: string | null;
    lastActiveAt: string;
  };
}

interface StudentsStats {
  totalStudents: number;
  totalEnrollments: number;
  totalCompletions: number;
  activeToday: number;
}

function StudentsTab({ courses }: { courses: AdminCourse[] }) {
  const [students, setStudents] = React.useState<StudentItem[]>([]);
  const [stats, setStats] = React.useState<StudentsStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("all");

  const fetchStudents = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (courseFilter && courseFilter !== "all") params.set("courseId", courseFilter);
      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setStudents(data.students || []);
      setStats(data.stats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载学员失败");
    } finally {
      setLoading(false);
    }
  }, [search, courseFilter]);

  React.useEffect(() => {
    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const formatRelative = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
    return formatDate(iso);
  };

  return (
    <div className="space-y-5">
      {/* 学员统计卡 */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Users,
              label: "学员总数",
              value: stats.totalStudents,
              tint: "from-rose-500/15 to-rose-500/5 text-rose-500",
            },
            {
              icon: GraduationCap,
              label: "报名总数",
              value: stats.totalEnrollments,
              tint: "from-amber-500/15 to-amber-500/5 text-amber-500",
            },
            {
              icon: BookCheck,
              label: "课时完成数",
              value: stats.totalCompletions,
              tint: "from-emerald-500/15 to-emerald-500/5 text-emerald-500",
            },
            {
              icon: Activity,
              label: "今日活跃",
              value: stats.activeToday,
              tint: "from-violet-500/15 to-violet-500/5 text-violet-500",
            },
          ].map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="relative overflow-hidden p-4">
                <div className={cn("absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br opacity-50 blur-2xl", m.tint)} />
                <div className="relative flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br", m.tint)}>
                    <m.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{m.value.toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">{m.label}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* 搜索 + 筛选 */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索学员昵称或邮箱…"
              className="h-9 pl-9"
            />
          </div>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[200px]">
              <SelectValue placeholder="全部课程" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部课程</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* 学员列表 */}
      <Card className="p-0">
        <div className="border-b px-5 py-4">
          <h3 className="text-base font-semibold">学员列表</h3>
          <p className="text-xs text-muted-foreground">
            共 {students.length} 位学员{courseFilter && courseFilter !== "all" ? "（已按课程筛选）" : ""}
          </p>
        </div>
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search || courseFilter ? "未找到匹配的学员" : "暂无学员"}
            </p>
          </div>
        ) : (
          <div className="scrollbar-thin max-h-[600px] overflow-y-auto">
            {students.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 border-b border-border/40 p-4 transition-colors hover:bg-muted/30"
              >
                {/* 头像 */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                  {s.name.slice(0, 1)}
                </div>
                {/* 信息 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    {s.enrollment?.completedAt && (
                      <Badge variant="outline" className="shrink-0 border-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400">
                        已结业
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                </div>
                {/* 数据 */}
                <div className="hidden shrink-0 gap-4 text-xs text-muted-foreground sm:flex">
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{s._count.enrollments}</div>
                    <div className="text-[10px]">报名</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{s._count.scripts}</div>
                    <div className="text-[10px]">文案</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{s._count.lessonCompletions}</div>
                    <div className="text-[10px]">完成课时</div>
                  </div>
                </div>
                {/* 进度（如有筛选课程） */}
                {s.enrollment && (
                  <div className="shrink-0 w-24 text-right">
                    <div className="text-xs font-semibold text-primary">
                      {Math.round(s.enrollment.progress)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatRelative(s.enrollment.lastActiveAt)}
                    </div>
                  </div>
                )}
                {/* 注册时间 */}
                <div className="hidden shrink-0 text-right text-[11px] text-muted-foreground md:block">
                  {formatDate(s.createdAt)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ----------------------- 报名审核组件 ----------------------- */

interface EnrollmentItem {
  id: string;
  userId: string;
  courseId: string;
  status: "pending" | "approved" | "rejected";
  progress: number;
  enrolledAt: string;
  completedAt: string | null;
  lastActiveAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    createdAt: string;
  };
  course: {
    id: string;
    title: string;
    price: number;
    isFree: boolean;
  };
}

function EnrollmentsTab({ courses }: { courses: AdminCourse[] }) {
  const [enrollments, setEnrollments] = React.useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("pending");
  const [actingId, setActingId] = React.useState<string | null>(null);
  // 手动添加报名
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualUserId, setManualUserId] = React.useState("");
  const [manualCourseId, setManualCourseId] = React.useState("");
  const [manualCreating, setManualCreating] = React.useState(false);
  const [searchUsers, setSearchUsers] = React.useState<Array<{ id: string; name: string; email: string }>>([]);
  const [searchingUsers, setSearchingUsers] = React.useState(false);

  const fetchEnrollments = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter === "all" ? "all" : statusFilter });
      const res = await fetch(`/api/admin/pending-enrollments?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setEnrollments(data.pending || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载报名记录失败");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleAction = async (enrollmentId: string, action: "approve" | "reject") => {
    setActingId(enrollmentId);
    try {
      const res = await fetch("/api/admin/pending-enrollments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      toast.success(action === "approve" ? "已通过" : "已拒绝");
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActingId(null);
    }
  };

  // 搜索学员（按邮箱/姓名）
  const handleSearchUser = async (q: string) => {
    setManualUserId(q);
    if (q.trim().length < 2) {
      setSearchUsers([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await fetch(`/api/admin/students?search=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSearchUsers((data.students || []).slice(0, 10));
    } catch {
      // ignore
    } finally {
      setSearchingUsers(false);
    }
  };

  // 手动创建报名
  const handleManualCreate = async () => {
    if (!manualUserId || !manualCourseId) {
      toast.error("请选择学员和课程");
      return;
    }
    setManualCreating(true);
    try {
      const res = await fetch("/api/admin/pending-enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: manualUserId, courseId: manualCourseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      toast.success("报名已创建并开通");
      setManualOpen(false);
      setManualUserId("");
      setManualCourseId("");
      setSearchUsers([]);
      fetchEnrollments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setManualCreating(false);
    }
  };

  const filtered = enrollments.filter((e) =>
    statusFilter === "all" ? true : e.status === statusFilter
  );

  const pendingCount = enrollments.filter((e) => e.status === "pending").length;
  const approvedCount = enrollments.filter((e) => e.status === "approved").length;
  const rejectedCount = enrollments.filter((e) => e.status === "rejected").length;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatRelative = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
    return formatDate(iso);
  };

  return (
    <div className="space-y-5">
      {/* 状态统计卡 */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          {
            icon: Users,
            label: "待审核",
            value: pendingCount,
            tint: "from-amber-500/15 to-amber-500/5 text-amber-500",
          },
          {
            icon: BookCheck,
            label: "已通过",
            value: approvedCount,
            tint: "from-emerald-500/15 to-emerald-500/5 text-emerald-500",
          },
          {
            icon: AlertTriangle,
            label: "已拒绝",
            value: rejectedCount,
            tint: "from-rose-500/15 to-rose-500/5 text-rose-500",
          },
          {
            icon: BarChart3,
            label: "总计",
            value: enrollments.length,
            tint: "from-violet-500/15 to-violet-500/5 text-violet-500",
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="relative overflow-hidden p-4">
              <div
                className={cn(
                  "absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br opacity-50 blur-2xl",
                  m.tint
                )}
              />
              <div className="relative flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br",
                    m.tint
                  )}
                >
                  <m.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xl font-bold">{m.value}</div>
                  <div className="text-[11px] text-muted-foreground">{m.label}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 筛选标签 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "pending", label: `待审核 (${pendingCount})` },
            { key: "approved", label: `已通过 (${approvedCount})` },
            { key: "rejected", label: `已拒绝 (${rejectedCount})` },
            { key: "all", label: `全部 (${enrollments.length})` },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "h-8 text-xs",
                statusFilter === tab.key &&
                  tab.key === "pending" &&
                  "bg-amber-500 text-white hover:bg-amber-600",
                statusFilter === tab.key &&
                  tab.key === "approved" &&
                  "bg-emerald-500 text-white hover:bg-emerald-600",
                statusFilter === tab.key &&
                  tab.key === "rejected" &&
                  "bg-rose-500 text-white hover:bg-rose-600",
                statusFilter === tab.key &&
                  tab.key === "all" &&
                  "bg-violet-500 text-white hover:bg-violet-600"
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* 手动添加报名 */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setManualOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          手动添加报名
        </Button>
      </div>

      {/* 报名列表 */}
      <Card className="p-0">
        <div className="border-b px-5 py-4">
          <h3 className="text-base font-semibold">报名记录</h3>
          <p className="text-xs text-muted-foreground">
            共 {filtered.length} 条记录
          </p>
        </div>
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListChecks className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {statusFilter === "pending"
                ? "暂无待审核的报名申请"
                : statusFilter === "approved"
                  ? "暂无已通过的报名"
                  : statusFilter === "rejected"
                    ? "暂无已拒绝的报名"
                    : "暂无报名记录"}
            </p>
          </div>
        ) : (
          <div className="scrollbar-thin max-h-[700px] overflow-y-auto">
            {filtered.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex flex-wrap items-center gap-4 border-b border-border/40 p-4 transition-colors hover:bg-muted/30 sm:flex-nowrap"
              >
                {/* 用户头像 + 信息 */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                    {e.user.name?.slice(0, 1) || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{e.user.name}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px]",
                          e.status === "pending" &&
                            "border-amber-500/30 text-amber-600 dark:text-amber-400",
                          e.status === "approved" &&
                            "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                          e.status === "rejected" &&
                            "border-rose-500/30 text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {e.status === "pending" && "待审核"}
                        {e.status === "approved" && "已通过"}
                        {e.status === "rejected" && "已拒绝"}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{e.user.email}</p>
                  </div>
                </div>

                {/* 课程信息 */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.course.title}</p>
                  <p className="text-xs text-muted-foreground">
                    全部课程统一授权申请 · 
                    报名于 {formatDate(e.enrolledAt)}
                  </p>
                </div>

                {/* 操作按钮 */}
                {e.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400"
                      onClick={() => handleAction(e.id, "approve")}
                      disabled={actingId === e.id}
                    >
                      {actingId === e.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <BookCheck className="mr-1 h-3 w-3" />
                      )}
                      通过
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
                      onClick={() => handleAction(e.id, "reject")}
                      disabled={actingId === e.id}
                    >
                      {actingId === e.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1 h-3 w-3" />
                      )}
                      拒绝
                    </Button>
                  </div>
                )}

                {/* 已处理的时间信息 */}
                {e.status !== "pending" && (
                  <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                    {formatRelative(e.lastActiveAt)}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* 手动添加报名弹窗 */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>手动添加报名</DialogTitle>
            <DialogDescription>
              为学员统一开通全部课程（线下缴费后使用）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 学员选择 */}
            <div className="space-y-2">
              <Label>选择学员</Label>
              <Input
                value={manualUserId}
                onChange={(e) => handleSearchUser(e.target.value)}
                placeholder="搜索学员邮箱或昵称…"
              />
              {searchingUsers && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  搜索中…
                </div>
              )}
              {searchUsers.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto rounded-md border border-border/60">
                  {searchUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setManualUserId(u.id);
                        setSearchUsers([]);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {u.name.slice(0, 1)}
                      </div>
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {manualUserId && searchUsers.length === 0 && !searchingUsers && (
                <p className="text-xs text-muted-foreground">
                  {manualUserId.includes("@") || manualUserId.length > 5
                    ? "已选中学员（ID: " + manualUserId.slice(0, 8) + "…）"
                    : "请输入至少2个字符搜索"}
                </p>
              )}
            </div>

            {/* 课程选择 */}
            <div className="space-y-2">
              <Label>选择课程</Label>
              <Select value={manualCourseId} onValueChange={setManualCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择课程" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setManualOpen(false)}>
                取消
              </Button>
              <Button onClick={handleManualCreate} disabled={manualCreating}>
                {manualCreating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    创建中…
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-4 w-4" />
                    开通全部课程
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------- AI 模型配置 Tab ----------------------- */

interface AiModelItem {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKeyMasked: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AiModelForm {
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  isDefault: boolean;
}

function AiModelsTab() {
  const [models, setModels] = React.useState<AiModelItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [showKey, setShowKey] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<AiModelItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [globalModelPublic, setGlobalModelPublic] = React.useState(true);
  const [togglingPublic, setTogglingPublic] = React.useState(false);
  const [form, setForm] = React.useState<AiModelForm>({
    name: "",
    baseUrl: "",
    model: "",
    apiKey: "",
    isDefault: false,
  });

  const fetchModels = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-models");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setModels(data.models || []);
      setGlobalModelPublic(data.globalModelPublic !== false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载模型失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleToggleGlobalPublic = async (value: boolean) => {
    setTogglingPublic(true);
    try {
      const res = await fetch("/api/admin/ai-models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalModelPublic: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "切换失败");
      setGlobalModelPublic(data.globalModelPublic);
      toast.success(value ? "全局模型已公开" : "全局模型已关闭");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "切换失败");
    } finally {
      setTogglingPublic(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", baseUrl: "", model: "", apiKey: "", isDefault: models.length === 0 });
    setShowKey(false);
    setDialogOpen(true);
  };

  const openEdit = (m: AiModelItem) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      baseUrl: m.baseUrl,
      model: m.model,
      apiKey: "",
      isDefault: m.isDefault,
    });
    setShowKey(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.baseUrl.trim() || !form.model.trim()) {
      toast.error("显示名、Base URL、模型名均为必填");
      return;
    }
    if (!editingId && !form.apiKey.trim()) {
      toast.error("新增模型时 API Key 必填");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),
        model: form.model.trim(),
        isDefault: form.isDefault,
      };
      // 编辑时 apiKey 留空则不传（保留原值）
      if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();

      const url = editingId
        ? `/api/admin/ai-models/${editingId}`
        : "/api/admin/ai-models";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      toast.success(editingId ? "模型已更新" : "模型已添加");
      setDialogOpen(false);
      fetchModels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存模型失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (m: AiModelItem) => {
    try {
      const res = await fetch(`/api/admin/ai-models/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "设置失败");
      toast.success(`已将「${m.name}」设为默认模型`);
      fetchModels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "设置默认失败");
    }
  };

  const handleToggleActive = async (m: AiModelItem) => {
    try {
      const res = await fetch(`/api/admin/ai-models/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "切换失败");
      toast.success(m.isActive ? "已停用" : "已启用");
      fetchModels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "切换状态失败");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/ai-models/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      toast.success("模型已删除");
      setDeleteTarget(null);
      fetchModels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除模型失败");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  return (
    <div className="space-y-5">
      <Card className="p-0">
        <CardHeader className="border-b px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">AI 模型配置</CardTitle>
              <CardDescription className="text-xs">
                添加 OpenAI 兼容端点，设其一为默认全局使用（文案 / 助教）。
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              添加模型
            </Button>
          </div>
        </CardHeader>

        {/* 全局模型公开开关 */}
        <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", globalModelPublic ? "bg-emerald-500" : "bg-amber-500")} />
            <div>
              <span className="text-sm font-medium">全局模型公开</span>
              <span className="ml-2 text-[11px] text-muted-foreground">
                {globalModelPublic
                  ? "普通用户可使用管理员配置的全局默认模型"
                  : "仅管理员可用全局模型，普通用户需配置自己的模型"}
              </span>
            </div>
          </div>
          <Switch
            checked={globalModelPublic}
            disabled={togglingPublic}
            onCheckedChange={handleToggleGlobalPublic}
          />
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              加载中…
            </div>
          ) : models.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Cpu className="h-8 w-8 opacity-40" />
              <p className="text-sm">尚未配置任何模型，点击「添加模型」开始</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">显示名 / 模型名</TableHead>
                  <TableHead className="w-[30%]">Base URL</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 font-medium">
                            {m.name}
                            {m.isDefault && (
                              <Badge variant="default" className="gap-1 bg-amber-500/90 px-1.5 text-[10px] text-white hover:bg-amber-500">
                                <Crown className="h-2.5 w-2.5" />
                                默认
                              </Badge>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">{m.model}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground break-all">
                      {m.baseUrl}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {m.apiKeyMasked || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(m)}
                        className="inline-flex items-center gap-1.5 text-xs hover:opacity-80"
                        title={m.isActive ? "点击停用" : "点击启用"}
                      >
                        <span className={cn("h-2 w-2 rounded-full", m.isActive ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                        {m.isActive ? "启用" : "停用"}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {!m.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleSetDefault(m)}
                          >
                            <Crown className="mr-1 h-3 w-3" />
                            设默认
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建 / 编辑 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑模型" : "添加模型"}</DialogTitle>
            <DialogDescription>
              {editingId ? "修改模型信息，API Key 留空则保留原值" : "填写 OpenAI 兼容端点信息"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* 显示名 */}
            <div className="grid gap-2">
              <Label>显示名</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：智谱 GLM-4-Flash"
              />
            </div>

            {/* Base URL */}
            <div className="grid gap-2">
              <Label>Base URL</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://open.bigmodel.cn/api/paas/v4"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                OpenAI 兼容端点，无需带 /chat/completions 后缀
              </p>
            </div>

            {/* 模型名 */}
            <div className="grid gap-2">
              <Label>模型名</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="glm-4-flash"
                className="font-mono text-xs"
              />
            </div>

            {/* API Key（隐藏输入） */}
            <div className="grid gap-2">
              <Label>API Key</Label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showKey ? "text" : "password"}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editingId ? "留空则不修改" : "输入 API Key"}
                  className="pl-8 pr-9 font-mono text-xs"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title={showKey ? "隐藏" : "显示"}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                默认隐藏输入，仅管理员可见
              </p>
            </div>

            {/* 设为默认 */}
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div>
                <Label className="text-sm">设为默认模型</Label>
                <p className="text-[11px] text-muted-foreground">
                  启用后，所有文案与助教调用将使用该模型
                </p>
              </div>
              <Switch
                checked={form.isDefault}
                onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  保存中…
                </>
              ) : editingId ? (
                "保存修改"
              ) : (
                "添加"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除模型</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.name}」，该操作不可撤销。{deleteTarget?.isDefault && " 删除默认模型后，将自动把最早一个模型设为默认。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 text-white hover:bg-rose-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  删除中…
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <XfyunAsrConfigCard />

      <FenggeConfigTab />

      <p className="px-1 text-[11px] text-muted-foreground">
        共 {models.length} 个模型 · 最后更新 {models[0] ? formatDate(models[0].updatedAt) : "—"}
      </p>
    </div>
  );
}

/* ----------------------- 讯飞 ASR 全局配置 ----------------------- */

function XfyunAsrConfigCard() {
  const [appId, setAppId] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [apiSecret, setApiSecret] = React.useState("");
  const [apiKeyMasked, setApiKeyMasked] = React.useState("");
  const [apiSecretMasked, setApiSecretMasked] = React.useState("");
  const [configured, setConfigured] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const fetchConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/asr-config");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setAppId(data.appId || "");
      setApiKeyMasked(data.apiKeyMasked || "");
      setApiSecretMasked(data.apiSecretMasked || "");
      setConfigured(data.configured || false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载讯飞配置失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!appId.trim() || !apiKey.trim() || !apiSecret.trim()) {
      toast.error("APPID、API Key、API Secret 均为必填");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/asr-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: appId.trim(),
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setApiKeyMasked(data.apiKeyMasked || "");
      setApiSecretMasked(data.apiSecretMasked || "");
      setConfigured(true);
      setEditing(false);
      setApiKey("");
      setApiSecret("");
      toast.success("讯飞 ASR 配置已保存，所有学员可使用");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-0">
      <CardHeader className="border-b px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">讯飞语音识别配置</CardTitle>
            <CardDescription className="text-xs">
              全局配置讯飞语音听写 API，用于抖音无字幕视频自动转文字。配置后所有学员可直接使用。
            </CardDescription>
          </div>
          <span className={cn("h-2.5 w-2.5 rounded-full", configured ? "bg-emerald-500" : "bg-amber-500")} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-5 py-4">
        {loading ? (
          <div className="flex items-center py-4 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            加载中…
          </div>
        ) : editing ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">APPID</Label>
                <Input
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="讯飞 APPID"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">API Key</Label>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="讯飞 API Key"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">API Secret</Label>
                <Input
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="讯飞 API Secret"
                  className="mt-1"
                  type="password"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    保存中…
                  </>
                ) : (
                  "保存配置"
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setApiKey("");
                  setApiSecret("");
                }}
              >
                取消
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs text-muted-foreground">APPID</Label>
                <p className="mt-1 text-sm font-medium">{appId || "未配置"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <p className="mt-1 text-sm font-medium">{apiKeyMasked || "未配置"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">API Secret</Label>
                <p className="mt-1 text-sm font-medium">{apiSecretMasked || "未配置"}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              {configured ? "修改配置" : "立即配置"}
            </Button>
          </>
        )}
        <p className="text-[11px] text-muted-foreground">
          前往{" "}
          <a
            href="https://console.xfyun.cn/services/iat"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            讯飞语音听写控制台
          </a>
          {" "}获取 API 密钥（每天500次免费额度）。配置后学员在抖音文案提取时可自动识别无字幕视频。
        </p>
      </CardContent>
    </Card>
  );
}

/* ----------------------- Markdown 工具栏 ----------------------- */

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
}

function MarkdownToolbar({ textareaRef, onChange }: MarkdownToolbarProps) {
  /** 在光标位置插入文本（或在选区前后包裹） */
  const insert = React.useCallback((before: string, after = "", placeholder = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    const selected = value.slice(start, end) || placeholder;
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);
    // 还原光标位置
    requestAnimationFrame(() => {
      ta.focus();
      const newStart = start + before.length;
      const newEnd = newStart + selected.length;
      ta.setSelectionRange(newStart, newEnd);
    });
  }, [textareaRef, onChange]);

  /** 在行首插入前缀（如 # / - / >） */
  const insertLinePrefix = React.useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    // 找到当前行开头
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }, [textareaRef, onChange]);

  /** 在光标处插入新行 */
  const insertBlock = React.useCallback((block: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const value = ta.value;
    const prevChar = start > 0 ? value[start - 1] : "";
    const needNewline = prevChar && prevChar !== "\n";
    const newValue = value.slice(0, start) + (needNewline ? "\n" : "") + block + value.slice(start);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      const newStart = start + (needNewline ? 1 : 0) + block.length;
      ta.setSelectionRange(newStart, newStart);
    });
  }, [textareaRef, onChange]);

  const tools = [
    { icon: Heading1, title: "一级标题", action: () => insertLinePrefix("# ") },
    { icon: Heading2, title: "二级标题", action: () => insertLinePrefix("## ") },
    { icon: Heading3, title: "三级标题", action: () => insertLinePrefix("### ") },
    { icon: Bold, title: "加粗", action: () => insert("**", "**", "加粗文字") },
    { icon: Italic, title: "斜体", action: () => insert("*", "*", "斜体文字") },
    { icon: List, title: "无序列表", action: () => insertLinePrefix("- ") },
    { icon: ListOrdered, title: "有序列表", action: () => insertLinePrefix("1. ") },
    { icon: Quote, title: "引用", action: () => insertLinePrefix("> ") },
    { icon: Code, title: "行内代码", action: () => insert("`", "`", "code") },
    { icon: LinkIcon, title: "链接", action: () => insert("[", "](https://)", "链接文字") },
    { icon: Minus, title: "分割线", action: () => insertBlock("\n---\n") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 p-1">
      {/* eslint-disable react-hooks/refs */}
      {tools.map((t, i) => (
        <button
          key={i}
          type="button"
          onClick={t.action}
          title={t.title}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-primary"
        >
          <t.icon className="h-3.5 w-3.5" />
        </button>
      ))}
      {/* eslint-enable react-hooks/refs */}
    </div>
  );
}
