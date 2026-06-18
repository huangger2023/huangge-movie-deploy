import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// 获取当前用户的剧情文档库
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const movieTitle = searchParams.get("movieTitle");

    const where: Record<string, unknown> = { userId: user.id };
    if (movieTitle?.trim()) {
      where.movieTitle = { contains: movieTitle.trim() };
    }
    const docs = await db.plotDocument.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        movieTitle: true,
        source: true,
        wordCount: true,
        createdAt: true,
        updatedAt: true,
        content: true,
      },
    });
    return NextResponse.json({ docs });
  } catch (e) {
    console.error("plots list error", e);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 新建/更新剧情文档（手动上传或粘贴）
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { id, movieTitle, content, source } = await req.json();
    if (!movieTitle?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "电影名称和剧情内容不能为空" },
        { status: 400 }
      );
    }
    if (id) {
      // 更新
      const doc = await db.plotDocument.update({
        where: { id },
        data: {
          movieTitle: movieTitle.trim(),
          content: content.trim(),
          source: source || "manual",
          wordCount: content.trim().length,
        },
      });
      return NextResponse.json({ doc });
    }
    // 新建（同电影同来源覆盖）
    const existing = await db.plotDocument.findFirst({
      where: {
        userId: user.id,
        movieTitle: movieTitle.trim(),
        source: source || "manual",
      },
    });
    if (existing) {
      const doc = await db.plotDocument.update({
        where: { id: existing.id },
        data: {
          content: content.trim(),
          wordCount: content.trim().length,
        },
      });
      return NextResponse.json({ doc });
    }
    const doc = await db.plotDocument.create({
      data: {
        userId: user.id,
        movieTitle: movieTitle.trim(),
        content: content.trim(),
        source: source || "manual",
        wordCount: content.trim().length,
      },
    });
    return NextResponse.json({ doc });
  } catch (e) {
    console.error("plots create error", e);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}

// 删除
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }
    const doc = await db.plotDocument.findUnique({ where: { id } });
    if (!doc || doc.userId !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
    await db.plotDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("plots delete error", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
