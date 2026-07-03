import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  const info: Record<string, unknown> = {
    cwd: process.cwd(),
    node: process.version,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || "(not set)",
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL || "(not set)",
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "(set)" : "(not set)",
      VERCEL: process.env.VERCEL || "(not set)",
    },
  };

  // Check various db paths
  const pathsToCheck = [
    "db/custom.db",
    "./db/custom.db",
    path.join(process.cwd(), "db", "custom.db"),
    path.join(process.cwd(), "..", "db", "custom.db"),
  ];

  info.fileChecks = pathsToCheck.map((p) => ({
    path: p,
    exists: fs.existsSync(p),
  }));

  // Check prisma directory
  const prismaPath = path.join(process.cwd(), "prisma");
  info.prismaExists = fs.existsSync(prismaPath);
  if (fs.existsSync(prismaPath)) {
    info.prismaFiles = fs.readdirSync(prismaPath);
  }

  // List root directory
  info.rootFiles = fs.readdirSync(process.cwd()).slice(0, 50);

  return NextResponse.json(info);
}
