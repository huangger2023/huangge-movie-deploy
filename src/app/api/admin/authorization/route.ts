import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  getAuthorizationEnabled,
  clearAuthCache,
} from "@/lib/license";

export const runtime = "nodejs";

const SETTING_KEY = "authorization_enabled";

/**
 * GET /api/admin/authorization
 * 获取授权开关状态 + 所有激活记录
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const authRequired = await getAuthorizationEnabled(db);

    const activations = await db.userActivation.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { activatedAt: "desc" },
    });

    const now = new Date();

    return NextResponse.json({
      authRequired,
      activations: activations.map((a) => {
        const expired = now > a.expireDate;
        const daysLeft = Math.max(
          0,
          Math.ceil((a.expireDate.getTime() - now.getTime()) / 86400000)
        );
        return {
          id: a.id,
          userId: a.userId,
          userName: a.user.name,
          userEmail: a.user.email,
          machineId: a.machineId,
          expireDate: a.expireDate.toISOString().slice(0, 10),
          activatedAt: a.activatedAt.toISOString(),
          expired,
          daysLeft,
        };
      }),
    });
  } catch (e) {
    console.error("admin authorization GET error", e);
    return NextResponse.json({ error: "加载授权信息失败" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/authorization
 * 切换授权开关
 * Body: { enabled: boolean }
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const enabled = Boolean(body.enabled);

    await db.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: String(enabled) },
      update: { value: String(enabled) },
    });

    clearAuthCache();

    return NextResponse.json({ success: true, authRequired: enabled });
  } catch (e) {
    console.error("admin authorization PATCH error", e);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/authorization?id=xxx
 * 撤销用户授权
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
    }

    await db.userActivation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin authorization DELETE error", e);
    return NextResponse.json({ error: "撤销授权失败" }, { status: 500 });
  }
}
