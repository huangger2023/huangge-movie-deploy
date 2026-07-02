import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/admin/pending-enrollments?status=pending|approved|rejected|all
 * 获取报名记录列表
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const status = req.nextUrl.searchParams.get("status") || "pending";
    const where = status === "all" ? {} : { status };

    const enrollments = await db.enrollment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            isFree: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return NextResponse.json({
      pending: enrollments.map((e) => ({
        id: e.id,
        userId: e.userId,
        courseId: e.courseId,
        status: e.status as "pending" | "approved" | "rejected",
        progress: e.progress,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        lastActiveAt: e.lastActiveAt,
        user: e.user,
        course: e.course,
      })),
    });
  } catch (e) {
    console.error("pending-enrollments GET error", e);
    return NextResponse.json({ error: "加载报名记录失败" }, { status: 500 });
  }
}

/**
 * POST /api/admin/pending-enrollments
 * 管理员手动创建报名并直接通过
 * Body: { userId, courseId }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const userId = String(body.userId || "").trim();
    const courseId = String(body.courseId || "").trim();

    if (!userId || !courseId) {
      return NextResponse.json(
        { error: "学员和课程均为必填" },
        { status: 400 }
      );
    }

    // 检查是否已有报名记录
    const existing = await db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existing) {
      // 已有记录，更新为 approved
      const updated = await db.enrollment.update({
        where: { id: existing.id },
        data: { status: "approved" },
      });
      return NextResponse.json({ enrollment: updated });
    }

    const created = await db.enrollment.create({
      data: { userId, courseId, status: "approved" },
    });

    return NextResponse.json({ enrollment: created });
  } catch (e) {
    console.error("pending-enrollments POST error", e);
    return NextResponse.json({ error: "创建报名失败" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/pending-enrollments
 * 审核报名：通过或拒绝
 * Body: { enrollmentId, action: "approve" | "reject" }
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const enrollmentId = String(body.enrollmentId || "").trim();
    const action = String(body.action || "").trim();

    if (!enrollmentId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "参数无效" },
        { status: 400 }
      );
    }

    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "报名记录不存在" }, { status: 404 });
    }

    const status = action === "approve" ? "approved" : "rejected";
    await db.enrollment.update({
      where: { id: enrollmentId },
      data: { status },
    });

    return NextResponse.json({ success: true, status });
  } catch (e) {
    console.error("pending-enrollments PATCH error", e);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
