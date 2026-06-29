import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/livekit/token
 *
 * 生成 LiveKit 接入令牌，浏览器通过该令牌连接自托管的 LiveKit Server。
 *
 * Body: { room?: string, identity?: string, name?: string }
 *
 * 环境变量：
 *   LIVEKIT_API_KEY    - LiveKit 项目 API Key
 *   LIVEKIT_API_SECRET - LiveKit 项目 API Secret
 *   LIVEKIT_URL        - LiveKit 服务器 WebSocket 地址（仅用于前端配置返回）
 *
 * 本地开发（livekit-server --dev）默认值：
 *   LIVEKIT_API_KEY    = devkey
 *   LIVEKIT_API_SECRET = secret
 *   LIVEKIT_URL        = ws://127.0.0.1:7880
 */

const API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "ws://127.0.0.1:7880";

/** base64url 编码（去掉 = 填充） */
function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** base64url 解码 */
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** 生成 HMAC-SHA256 签名 */
function sign(payload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

/** 生成 LiveKit JWT token */
function generateToken(opts: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name?: string;
  room: string;
  ttl?: number; // seconds
}): string {
  const ttl = opts.ttl ?? 3600; // 1 hour default
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: opts.apiKey,
    sub: opts.identity,
    name: opts.name || opts.identity,
    exp: now + ttl,
    iat: now,
    nbf: now,
    video: {
      room: opts.room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    },
  };

  const headerB64 = b64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  const signature = sign(`${headerB64}.${payloadB64}`, opts.apiSecret);

  return `${headerB64}.${payloadB64}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const identity =
      String(body?.identity || "").trim() ||
      `user_${Math.random().toString(36).slice(2, 8)}`;
    const name = String(body?.name || "").trim() || identity;
    const room = String(body?.room || "").trim() || "huangge-chat";

    const token = generateToken({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
      identity,
      name,
      room,
    });

    return NextResponse.json({
      token,
      room,
      identity,
      name,
      livekitUrl: LIVEKIT_URL,
    });
  } catch (e) {
    console.error("livekit token error", e);
    return NextResponse.json(
      { error: "生成令牌失败" },
      { status: 500 }
    );
  }
}

/** GET 返回 LiveKit 配置（供前端读取连接信息） */
export async function GET() {
  return NextResponse.json({
    livekitUrl: LIVEKIT_URL,
    configured: !!(process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_API_SECRET),
  });
}