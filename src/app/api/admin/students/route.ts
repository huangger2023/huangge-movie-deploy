import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** 获取学员列表（仅管理员） */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const courseId = searchParams.get("courseId") || "";

    const where: { role: string; AND?: unknown[] } = { role: "STUDENT" };
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        },
      ];
    }

    const students = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true,
            scripts: true,
            lessonCompletions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    let filtered = students;
    if (courseId) {
      const enrollments = await db.enrollment.findMany({
        where: { courseId },
        select: {
          userId: true,
          progress: true,
          enrolledAt: true,
          completedAt: true,
          lastActiveAt: true,
        },
      });
      const enrollMap = new Map(enrollments.map((e) => [e.userId, e]));
      filtered = students
        .filter((s) => enrollMap.has(s.id))
        .map((s) => {
          const e = enrollMap.get(s.id)!;
          return { ...s, enrollment: e };
        });
    }

    const totalStudents = await db.user.count({ where: { role: "STUDENT" } });
    const totalEnrollments = await db.enrollment.count();
    const totalCompletions = await db.lessonCompletion.count();
    const activeToday = await db.user.count({
      where: {
        role: "STUDENT",
        enrollments: { some: { lastActiveAt: { gte: new Date(Date.now() - 86400000) } } },
      },
    });

    return NextResponse.json({
      students: filtered,
      stats: {
        totalStudents,
        totalEnrollments,
        totalCompletions,
        activeToday,
      },
    });
  } catch (e) {
    console.error("students list error", e);
    return NextResponse.json({ error: "获取学员列表失败" }, { status: 500 });
  }
}
