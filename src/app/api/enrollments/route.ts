import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// 报名课程 (免费直接报名，付费模拟支付成功)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { courseId } = await req.json();
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    const existing = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (existing) {
      return NextResponse.json({ enrollment: existing, already: true });
    }

    const enrollment = await db.enrollment.create({
      data: { userId: user.id, courseId },
    });
    return NextResponse.json({ enrollment });
  } catch (e) {
    console.error("enroll error", e);
    return NextResponse.json({ error: "报名失败" }, { status: 500 });
  }
}

// 更新学习进度
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { courseId, progress, lastLessonId } = await req.json();
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "未报名该课程" }, { status: 403 });
    }
    const updated = await db.enrollment.update({
      where: { userId_courseId: { userId: user.id, courseId } },
      data: {
        progress: Math.max(enrollment.progress, progress ?? 0),
        lastLessonId: lastLessonId ?? enrollment.lastLessonId,
        lastActiveAt: new Date(),
        completedAt: progress >= 100 ? new Date() : null,
      },
    });
    return NextResponse.json({ enrollment: updated });
  } catch (e) {
    console.error("progress error", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
