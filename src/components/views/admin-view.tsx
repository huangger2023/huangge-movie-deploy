"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Crown,
  Users,
  DollarSign,
  BookOpen,
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon,
  Star,
  ListChecks,
  ChevronUp,
  ChevronDown,
  BarChart3,
  TrendingUp,
  Wallet,
  Activity,
  GraduationCap,
  Layers,
  BookCheck,
  Search,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
    instructor: form.instructor.trim() || "影述学院导师",
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

  // 权限校验
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="relative min-h-[70vh] overflow-hidden">
        <div className="absolute inset-0 bg-cinema-radial" />
        <div className="relative mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15 text-destructive"
          >
            <ShieldCheck className="h-10 w-10" />
          </motion.div>
          <h2 className="mb-2 text-2xl font-bold">无访问权限</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            该页面仅限管理员访问，请使用管理员账号登录后重试
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setView("home")}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              返回首页
            </Button>
            {!user && (
              <Button
                onClick={() => setView("auth")}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                去登录
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const totalStudents = courses.reduce(
    (sum, c) => sum + (c.studentsCount || 0),
    0
  );
  const totalRevenue = courses.reduce(
    (sum, c) => sum + (c.isFree ? 0 : (c.price || 0) * (c.studentsCount || 0)),
    0
  );

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
      label: "累计学员",
      value: totalStudents.toLocaleString(),
      tint: "bg-amber-500/10 text-amber-500",
    },
    {
      icon: DollarSign,
      label: "收入估算",
      value: `¥${totalRevenue.toLocaleString()}`,
      tint: "bg-emerald-500/10 text-emerald-500",
    },
  ];

  return (
    <div className="relative min-h-[70vh]">
      <div className="absolute inset-x-0 top-0 h-48 bg-cinema-radial" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow-primary">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <Badge className="bg-accent text-accent-foreground">
                <Crown className="mr-1 h-3 w-3" />
                管理员
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              管理后台 · 课程管理
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              管理平台所有课程内容、价格与上架状态
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            新建课程
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    s.tint
                  )}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      s.value
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Tabs: 课程管理 / 数据看板 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6"
        >
          <Tabs defaultValue="courses" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="courses" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                课程管理
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                数据看板
              </TabsTrigger>
              <TabsTrigger value="students" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                学员管理
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

            {/* 数据看板 Tab */}
            <TabsContent value="dashboard" className="mt-4">
              <DashboardTab
                courses={courses}
                totalStudents={totalStudents}
                totalRevenue={totalRevenue}
                loading={loading}
              />
            </TabsContent>

            {/* 学员管理 Tab */}
            <TabsContent value="students" className="mt-4">
              <StudentsTab courses={courses} />
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
                placeholder="例如：抖音电影解说 · 从 0 到百万播放"
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
                placeholder="每行一条，例如：&#10;AI 文案工具永久免费&#10;6 年赛道操盘经验沉淀"
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
                      <Badge variant="outline" className="shrink-0 text-[10px] text-primary">
                        含视频
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {lesson.content ? lesson.content.slice(0, 80) + (lesson.content.length > 80 ? "…" : "") : "（暂无内容）"}
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
        <Label className="text-xs">内容（讲义）</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="课时详细内容，支持多段落…"
          className="min-h-[180px] resize-y scrollbar-thin text-sm"
        />
        <p className="text-[10px] text-muted-foreground">{content.length} 字</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">视频 URL（可选）</Label>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://..."
            className="h-9"
          />
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

/* ----------------------- 数据看板组件 ----------------------- */

function DashboardTab({
  courses,
  totalStudents,
  totalRevenue,
  loading,
}: {
  courses: AdminCourse[];
  totalStudents: number;
  totalRevenue: number;
  loading: boolean;
}) {
  // 计算各项指标
  const totalLessons = courses.reduce((s, c) => s + (c._count?.lessons || 0), 0);
  const freeCount = courses.filter((c) => c.isFree).length;
  const paidCount = courses.length - freeCount;
  const featuredCount = courses.filter((c) => c.isFeatured).length;
  const avgPrice = paidCount > 0
    ? Math.round(courses.filter((c) => !c.isFree).reduce((s, c) => s + c.price, 0) / paidCount)
    : 0;
  const avgStudents = courses.length > 0 ? Math.round(totalStudents / courses.length) : 0;

  // 按分类分布
  const byCategory = React.useMemo(() => {
    const map = new Map<string, { count: number; students: number; revenue: number }>();
    for (const c of courses) {
      const k = c.category || "未分类";
      const cur = map.get(k) || { count: 0, students: 0, revenue: 0 };
      cur.count += 1;
      cur.students += c.studentsCount || 0;
      cur.revenue += c.isFree ? 0 : (c.price || 0) * (c.studentsCount || 0);
      map.set(k, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].students - a[1].students);
  }, [courses]);

  // 按难度分布
  const byLevel = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of courses) {
      const k = c.level || "未设";
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [courses]);

  // 学员 Top 5 课程
  const topCourses = React.useMemo(() => {
    return [...courses].sort((a, b) => b.studentsCount - a.studentsCount).slice(0, 5);
  }, [courses]);

  // 收入 Top 5 课程
  const topRevenue = React.useMemo(() => {
    return [...courses]
      .map((c) => ({ ...c, revenue: c.isFree ? 0 : (c.price || 0) * (c.studentsCount || 0) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [courses]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      icon: BookOpen,
      label: "课程总数",
      value: String(courses.length),
      sub: `${freeCount} 免费 / ${paidCount} 付费`,
      tint: "from-rose-500/15 to-rose-500/5 text-rose-500",
    },
    {
      icon: Layers,
      label: "课时总数",
      value: String(totalLessons),
      sub: `平均 ${courses.length > 0 ? Math.round(totalLessons / courses.length) : 0} 节/课`,
      tint: "from-violet-500/15 to-violet-500/5 text-violet-500",
    },
    {
      icon: Users,
      label: "累计学员",
      value: totalStudents.toLocaleString(),
      sub: `平均 ${avgStudents}/课`,
      tint: "from-amber-500/15 to-amber-500/5 text-amber-500",
    },
    {
      icon: Wallet,
      label: "收入估算",
      value: `¥${totalRevenue.toLocaleString()}`,
      sub: `均价 ¥${avgPrice}`,
      tint: "from-emerald-500/15 to-emerald-500/5 text-emerald-500",
    },
  ];

  const maxStudents = topCourses[0]?.studentsCount || 1;
  const maxRevenue = topRevenue[0]?.revenue || 1;
  const maxCatStudents = byCategory[0]?.[1].students || 1;

  return (
    <div className="space-y-5">
      {/* 核心指标 4 卡 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className={cn("relative overflow-hidden p-5")}>
              <div className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-50 blur-2xl", m.tint)} />
              <div className="relative flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br", m.tint)}>
                  <m.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold tracking-tight">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </div>
              </div>
              <div className="relative mt-3 text-[11px] text-muted-foreground">
                {m.sub}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 学员 Top 5 */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              学员数 Top 5
            </h3>
            <span className="text-[11px] text-muted-foreground">按报名人数排序</span>
          </div>
          <div className="space-y-3">
            {topCourses.map((c, i) => (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                      i === 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      i === 1 ? "bg-slate-400/15 text-slate-500" :
                      i === 2 ? "bg-orange-700/15 text-orange-700 dark:text-orange-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {i + 1}
                    </span>
                    <span className="truncate font-medium">{c.title}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-primary">
                    {c.studentsCount.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.studentsCount / maxStudents) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 收入 Top 5 */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Wallet className="h-4 w-4 text-emerald-500" />
              收入贡献 Top 5
            </h3>
            <span className="text-[11px] text-muted-foreground">价格 × 学员数</span>
          </div>
          <div className="space-y-3">
            {topRevenue.map((c, i) => (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                      i === 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      i === 1 ? "bg-slate-400/15 text-slate-500" :
                      i === 2 ? "bg-orange-700/15 text-orange-700 dark:text-orange-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {i + 1}
                    </span>
                    <span className="truncate font-medium">{c.title}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                    ¥{c.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.revenue / maxRevenue) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 分类分布 */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <GraduationCap className="h-4 w-4 text-accent" />
              分类分布
            </h3>
            <span className="text-[11px] text-muted-foreground">{byCategory.length} 个分类</span>
          </div>
          <div className="space-y-3">
            {byCategory.map(([cat, data], i) => (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{cat}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{data.count} 课</span>
                    <span className="font-semibold text-foreground">{data.students.toLocaleString()} 学员</span>
                    <span className="text-emerald-600 dark:text-emerald-400">¥{data.revenue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.students / maxCatStudents) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 难度分布 + 精选统计 */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-violet-500" />
              难度 & 精选统计
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {byLevel.map(([level, count]) => (
              <div key={level} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="text-[11px] text-muted-foreground">{level}</div>
                <div className="mt-1 text-xl font-bold">{count}</div>
                <div className="text-[10px] text-muted-foreground">门课程</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                <Crown className="h-3 w-3" />
                精选课程
              </div>
              <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{featuredCount}</div>
              <div className="text-[10px] text-muted-foreground">门已精选</div>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Star className="h-3 w-3" />
                免费课程
              </div>
              <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{freeCount}</div>
              <div className="text-[10px] text-muted-foreground">门免费</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ----------------------- 学员管理组件 ----------------------- */

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
  const [courseFilter, setCourseFilter] = React.useState("");

  const fetchStudents = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (courseFilter) params.set("courseId", courseFilter);
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
              <SelectItem value="">全部课程</SelectItem>
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
            共 {students.length} 位学员{courseFilter ? "（已按课程筛选）" : ""}
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
