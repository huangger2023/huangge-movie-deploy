import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * 标记/取消标记课时完成状态
 * POST   /api/lessons/{lessonId}/complete   标记完成
 * DELETE /api/lessons/{lessonId}/complete   取消完成
 */
async function getLesson(lessonId: string) {
  return db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  });
}

/** 同步 enrollment.progress */
async function syncEnrollmentProgress(userId: string, courseId: string) {
  const [totalLessons, completedLessons] = await Promise.all([
    db.lesson.count({ where: { courseId } }),
    db.lessonCompletion.count({
      where: { userId, courseId },
    }),
  ]);
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (enrollment) {
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progress,
        completedAt: progress >= 100 ? new Date() : null,
        lastActiveAt: new Date(),
      },
    });
  }
  return { totalLessons, completedLessons, progress };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { lessonId } = await params;
    const lesson = await getLesson(lessonId);
    if (!lesson) {
      return NextResponse.json({ error: "课时不存在" }, { status: 404 });
    }
    // upsert（用 unique [userId, lessonId]）
    await db.lessonCompletion.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: {
        userId: user.id,
        lessonId,
        courseId: lesson.courseId,
      },
      update: {
        completedAt: new Date(),
      },
    });
    const { totalLessons, completedLessons, progress } = await syncEnrollmentProgress(
      user.id,
      lesson.courseId
    );
    return NextResponse.json({
      completed: true,
      totalLessons,
      completedLessons,
      progress,
    });
  } catch (e) {
    console.error("lesson complete error", e);
    return NextResponse.json({ error: "标记失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { lessonId } = await params;
    const lesson = await getLesson(lessonId);
    if (!lesson) {
      return NextResponse.json({ error: "课时不存在" }, { status: 404 });
    }
    await db.lessonCompletion.deleteMany({
      where: { userId: user.id, lessonId },
    });
    const { totalLessons, completedLessons, progress } = await syncEnrollmentProgress(
      user.id,
      lesson.courseId
    );
    return NextResponse.json({
      completed: false,
      totalLessons,
      completedLessons,
      progress,
    });
  } catch (e) {
    console.error("lesson uncomplete error", e);
    return NextResponse.json({ error: "取消失败" }, { status: 500 });
  }
}

/** 获取当前用户在某课程的已完成课时 id 列表 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
    }
    const completions = await db.lessonCompletion.findMany({
      where: { userId: user.id, courseId },
      select: { lessonId: true, completedAt: true },
    });
    return NextResponse.json({
      completedLessonIds: completions.map((c) => c.lessonId),
      count: completions.length,
    });
  } catch (e) {
    console.error("lesson completions get error", e);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
