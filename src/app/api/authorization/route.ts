import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getAuthorizationEnabled,
  verifyLicense,
  clearAuthCache,
} from "@/lib/license";

export const runtime = "nodejs";

/**
 * GET /api/authorization
 *
 * 返回当前用户的授权状态：
 * - authRequired: 是否开启了授权拦截
 * - activated: 是否已激活
 * - expired: 是否已过期
 * - adminBypass: 管理员免授权
 * - user: 当前用户 ID（未登录为 null）
 * - machineId / expireDate / daysLeft: 激活信息
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const authRequired = await getAuthorizationEnabled(db);

    // 授权未开启
    if (!authRequired) {
      return NextResponse.json({
        authRequired: false,
        activated: true,
        user: user?.id ?? null,
      });
    }

    // 未登录
    if (!user) {
      return NextResponse.json({
        authRequired: true,
        activated: false,
        user: null,
      });
    }

    // 管理员免授权
    if (user.role === "ADMIN") {
      return NextResponse.json({
        authRequired: true,
        activated: true,
        adminBypass: true,
        user: user.id,
      });
    }

    // 检查激活记录
    const activation = await db.userActivation.findUnique({
      where: { userId: user.id },
    });

    if (!activation) {
      return NextResponse.json({
        authRequired: true,
        activated: false,
        user: user.id,
      });
    }

    const now = new Date();
    const expired = now > activation.expireDate;
    const daysLeft = Math.max(
      0,
      Math.ceil((activation.expireDate.getTime() - now.getTime()) / 86400000)
    );

    return NextResponse.json({
      authRequired: true,
      activated: !expired,
      expired,
      user: user.id,
      machineId: activation.machineId,
      expireDate: activation.expireDate.toISOString().slice(0, 10),
      daysLeft,
    });
  } catch (e) {
    console.error("authorization GET error", e);
    // 出错时不拦截，允许访问
    return NextResponse.json({
      authRequired: false,
      activated: true,
      user: null,
    });
  }
}

/**
 * POST /api/authorization
 *
 * 激活授权码。
 * Body: { licenseKey: string, machineId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await req.json();
    const licenseKey = String(body.licenseKey || "").trim();
    const machineId = String(body.machineId || "").trim();

    if (!licenseKey || !machineId) {
      return NextResponse.json(
        { error: "激活码和机器码均为必填" },
        { status: 400 }
      );
    }

    const result = verifyLicense(licenseKey, machineId);
    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || "激活码无效" },
        { status: 400 }
      );
    }

    if (result.expired) {
      return NextResponse.json(
        { error: "激活码已过期，请联系管理员获取新的激活码" },
        { status: 400 }
      );
    }

    // 写入或更新激活记录
    await db.userActivation.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        machineId: result.machineId,
        licenseKey,
        expireDate: new Date(result.expireTimestamp * 1000),
      },
      update: {
        machineId: result.machineId,
        licenseKey,
        expireDate: new Date(result.expireTimestamp * 1000),
      },
    });

    clearAuthCache();

    return NextResponse.json({
      success: true,
      machineId: result.machineId,
      expireDate: result.expireDate,
      daysLeft: result.daysLeft,
    });
  } catch (e) {
    console.error("authorization POST error", e);
    return NextResponse.json({ error: "激活失败，请重试" }, { status: 500 });
  }
}
