import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// 更新工作台项目某个字段（文案/标题/开头/分镜/笔记/状态）
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { id, ...fields } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }
    const ws = await db.workspace.findUnique({ where: { id } });
    if (!ws || ws.userId !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
    // 只允许更新这些字段
    const allowed: Record<string, unknown> = {};
    for (const k of [
      "movieTitle",
      "genre",
      "coverColor",
      "status",
      "script",
      "titles",
      "hooks",
      "storyboard",
      "notes",
    ]) {
      if (k in fields) allowed[k] = fields[k];
    }
    const updated = await db.workspace.update({
      where: { id },
      data: allowed,
    });
    return NextResponse.json({ workspace: updated });
  } catch (e) {
    console.error("workspace update error", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除工作台项目
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
    const ws = await db.workspace.findUnique({ where: { id } });
    if (!ws || ws.userId !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
    await db.workspace.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("workspace delete error", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
