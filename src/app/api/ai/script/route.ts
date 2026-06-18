import { NextRequest, NextResponse } from "next/server";
import { generateNarrationScript, type ScriptGenInput } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScriptGenInput;
    if (!body.movieTitle?.trim()) {
      return NextResponse.json({ error: "请填写电影名称" }, { status: 400 });
    }

    const output = await generateNarrationScript({
      movieTitle: body.movieTitle.trim(),
      genre: body.genre || "剧情",
      style: body.style || "悬疑反转",
      duration: body.duration || "90秒",
      hookType: body.hookType || "悬念提问",
      tone: body.tone || "犀利",
      keywords: body.keywords,
      extraNotes: body.extraNotes,
      plotContext: body.plotContext,
    });

    const user = await getCurrentUser();
    let savedId: string | null = null;
    if (user) {
      const rec = await db.generatedScript.create({
        data: {
          userId: user.id,
          type: "SCRIPT",
          movieTitle: body.movieTitle.trim(),
          genre: body.genre || "剧情",
          input: JSON.stringify(body),
          output,
          meta: JSON.stringify({ style: body.style, duration: body.duration }),
        },
      });
      savedId = rec.id;
      await db.toolUsage.upsert({
        where: { userId_toolType: { userId: user.id, toolType: "SCRIPT" } },
        create: { userId: user.id, toolType: "SCRIPT", count: 1 },
        update: { count: { increment: 1 } },
      });
    }

    return NextResponse.json({ output, savedId });
  } catch (e) {
    console.error("script-gen error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "生成失败，请重试" },
      { status: 500 }
    );
  }
}
