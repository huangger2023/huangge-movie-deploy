import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

/**
 * 临时诊断路由：探明 Vercel lambda 里 db/custom.db 的真实路径。
 * 排查完会删除。
 */
export async function GET() {
  const cwd = process.cwd();
  const dbUrl = process.env.DATABASE_URL ?? "(未设置)";
  const candidates = [
    path.join(cwd, "db/custom.db"),
    path.join(cwd, "custom.db"),
    "/var/task/db/custom.db",
    "/var/task/custom.db",
  ];
  const results: Record<string, unknown> = {
    cwd,
    DATABASE_URL: dbUrl,
    __dirname: __dirname,
    candidates: [] as Array<{ path: string; exists: boolean; size?: number }>,
  };

  for (const p of candidates) {
    try {
      const stat = await fs.stat(p);
      (results.candidates as Array<{ path: string; exists: boolean; size?: number }>).push({
        path: p,
        exists: true,
        size: stat.size,
      });
    } catch {
      (results.candidates as Array<{ path: string; exists: boolean; size?: number }>).push({
        path: p,
        exists: false,
      });
    }
  }

  // 顺便看 cwd 顶层和 db/ 目录有什么
  try {
    const top = await fs.readdir(cwd);
    results["cwd_entries"] = top;
  } catch (e) {
    results["cwd_entries_err"] = (e as Error).message;
  }
  try {
    const dbdir = await fs.readdir(path.join(cwd, "db"));
    results["db_dir_entries"] = dbdir;
  } catch (e) {
    results["db_dir_err"] = (e as Error).message;
  }

  return NextResponse.json(results);
}
