import { NextRequest, NextResponse } from "next/server";
import { generateTitles } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.movieTitle?.trim()) {
      return NextResponse.json({ error: "请填写电影名称" }, { status: 400 });
    }
    const output = await generateTitles({
      movieTitle: body.movieTitle.trim(),
      genre: body.genre || "剧情",
      count: body.count ?? 8,
      plotContext: body.plotContext,
    });

    const user = await getCurrentUser();
    let savedId: string | null = null;
    if (user) {
      const rec = await db.generatedScript.create({
        data: {
          userId: user.id,
          type: "TITLE",
          movieTitle: body.movieTitle.trim(),
          genre: body.genre || "剧情",
          input: JSON.stringify(body),
          output,
          meta: JSON.stringify({ count: body.count ?? 8 }),
        },
      });
      savedId = rec.id;
      await db.toolUsage.upsert({
        where: { userId_toolType: { userId: user.id, toolType: "TITLE" } },
        create: { userId: user.id, toolType: "TITLE", count: 1 },
        update: { count: { increment: 1 } },
      });
    }
    return NextResponse.json({ output, savedId });
  } catch (e) {
    console.error("title-gen error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "生成失败" },
      { status: 500 }
    );
  }
}
