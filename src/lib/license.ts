import "server-only";
import crypto from "crypto";

/**
 * 激活码验证模块（服务端专用）
 *
 * 与「激活码管理器」使用相同的 HMAC-SHA256 v1 协议：
 * 激活码 = Base64( machine_id|expire_timestamp|hmac_sha256_secret[:16] )
 */

const LICENSE_SECRET = process.env.LICENSE_SECRET || "HANG_GE_DU_XUAN_WEB_LICENSE_SECRET_2025";
const SECONDS_PER_DAY = 86400;

export interface LicenseVerifyResult {
  valid: boolean;
  expired: boolean;
  machineId: string;
  expireDate: string;
  expireTimestamp: number;
  daysLeft: number;
  error?: string;
}

/**
 * 验证激活码。
 * @param licenseKey Base64 编码的激活码
 * @param expectedMachineId 可选：如果提供，则校验机器码是否匹配
 */
export function verifyLicense(
  licenseKey: string,
  expectedMachineId?: string
): LicenseVerifyResult {
  const key = licenseKey.trim();
  if (!key) {
    return invalidResult("激活码为空");
  }

  let decoded: string;
  try {
    decoded = Buffer.from(key, "base64").toString("utf-8");
  } catch {
    return invalidResult("激活码格式错误（Base64 解码失败）");
  }

  const parts = decoded.split("|");

  // v2 格式：v2|machine_id|expire|signature
  if (parts.length === 4 && parts[0] === "v2") {
    return invalidResult("暂不支持 v2 (Ed25519) 格式的激活码");
  }

  // v1 格式：machine_id|expire|signature
  if (parts.length !== 3) {
    return invalidResult("激活码格式错误（字段数不匹配）");
  }

  const [machineId, expireTimeRaw, signature] = parts;
  const rawData = `${machineId}|${expireTimeRaw}`;

  // HMAC-SHA256 验签，取前 16 位 hex
  const expectedSig = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(rawData, "utf-8")
    .digest("hex")
    .slice(0, 16);

  if (signature !== expectedSig) {
    return invalidResult("激活码签名验证失败");
  }

  const expireTimestamp = parseInt(expireTimeRaw, 10);
  if (isNaN(expireTimestamp)) {
    return invalidResult("激活码过期时间无效");
  }

  const now = Math.floor(Date.now() / 1000);
  const expired = now > expireTimestamp;
  const daysLeft = Math.max(0, Math.ceil((expireTimestamp - now) / SECONDS_PER_DAY));

  if (expectedMachineId && machineId !== expectedMachineId.trim()) {
    return invalidResult("激活码与当前设备不匹配");
  }

  const expireDate = new Date(expireTimestamp * 1000).toISOString().slice(0, 10);

  return {
    valid: true,
    expired,
    machineId,
    expireDate,
    expireTimestamp,
    daysLeft,
  };
}

function invalidResult(error: string): LicenseVerifyResult {
  return {
    valid: false,
    expired: false,
    machineId: "",
    expireDate: "",
    expireTimestamp: 0,
    daysLeft: 0,
    error,
  };
}

/**
 * 判断用户是否已授权（授权开关关闭时直接通过，开启时检查激活记录）。
 */
export async function isUserAuthorized(
  userId: string,
  db: { userActivation: { findUnique: (args: { where: { userId: string } }) => Promise<{ expireDate: Date } | null> } }
): Promise<{ authorized: boolean; reason?: string }> {
  const setting = await getAuthorizationEnabled(db as any).catch(() => false);
  if (!setting) {
    return { authorized: true };
  }

  const activation = await db.userActivation.findUnique({
    where: { userId },
  });

  if (!activation) {
    return { authorized: false, reason: "尚未激活授权" };
  }

  if (new Date() > activation.expireDate) {
    return { authorized: false, reason: "授权已过期" };
  }

  return { authorized: true };
}

/**
 * 读取授权开关状态（带缓存）。
 */
let authEnabledCache: { value: boolean; expiresAt: number } = {
  value: false,
  expiresAt: 0,
};

export async function getAuthorizationEnabled(
  db: { systemSetting: { findUnique: (args: { where: { key: string } }) => Promise<{ value: string } | null> } }
): Promise<boolean> {
  const now = Date.now();
  if (now < authEnabledCache.expiresAt) {
    return authEnabledCache.value;
  }

  try {
    const row = await db.systemSetting.findUnique({
      where: { key: "authorization_enabled" },
    });
    const value = row?.value === "true";
    authEnabledCache = { value, expiresAt: now + 10_000 };
    return value;
  } catch {
    authEnabledCache = { value: false, expiresAt: now + 10_000 };
    return false;
  }
}

/**
 * 清除授权开关缓存（管理员修改后调用）。
 */
export function clearAuthCache() {
  authEnabledCache = { value: false, expiresAt: 0 };
}
