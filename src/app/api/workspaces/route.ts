import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// 获取当前用户的工作台项目列表
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const workspaces = await db.workspace.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        movieTitle: true,
        genre: true,
        coverColor: true,
        status: true,
        script: true,
        titles: true,
        hooks: true,
        storyboard: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // 计算每个项目的完成度
    const items = workspaces.map((w) => {
      const filled = [
        w.script,
        w.titles,
        w.hooks,
        w.storyboard,
      ].filter((x) => x && x.trim().length > 0).length;
      return { ...w, progress: Math.round((filled / 4) * 100) };
    });
    return NextResponse.json({ workspaces: items });
  } catch (e) {
    console.error("workspaces list error", e);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 新建工作台项目
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { movieTitle, genre, coverColor } = await req.json();
    if (!movieTitle?.trim()) {
      return NextResponse.json({ error: "请填写电影名称" }, { status: 400 });
    }
    const ws = await db.workspace.create({
      data: {
        userId: user.id,
        movieTitle: movieTitle.trim(),
        genre: genre || "剧情",
        coverColor: coverColor || "rose",
      },
    });
    return NextResponse.json({ workspace: ws });
  } catch (e) {
    console.error("workspace create error", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
