import { NextRequest, NextResponse } from "next/server";
import { searchMoviePlot } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

// Agent 联网搜索电影真实剧情
export async function POST(req: NextRequest) {
  try {
    const { movieTitle, genre } = await req.json();
    if (!movieTitle?.trim()) {
      return NextResponse.json({ error: "请填写电影名称" }, { status: 400 });
    }
    const result = await searchMoviePlot(movieTitle.trim(), genre);

    // 若用户已登录，自动保存为剧情文档（source=web），供后续复用
    const user = await getCurrentUser();
    let savedPlotId: string | null = null;
    if (user && result.combined.length > 100) {
      const existing = await db.plotDocument.findFirst({
        where: { userId: user.id, movieTitle: movieTitle.trim(), source: "web" },
      });
      if (existing) {
        await db.plotDocument.update({
          where: { id: existing.id },
          data: {
            content: result.combined,
            wordCount: result.combined.length,
          },
        });
        savedPlotId = existing.id;
      } else {
        const doc = await db.plotDocument.create({
          data: {
            userId: user.id,
            movieTitle: movieTitle.trim(),
            content: result.combined,
            source: "web",
            wordCount: result.combined.length,
          },
        });
        savedPlotId = doc.id;
      }
    }

    return NextResponse.json({ ...result, savedPlotId });
  } catch (e) {
    console.error("agent search error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "联网搜索剧情失败" },
      { status: 500 }
    );
  }
}
