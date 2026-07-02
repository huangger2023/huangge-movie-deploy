// 清理课程表中的假数据：studentsCount / rating / ratingCount 归零
// 这些字段是 seed 时硬编码的假数字，真实数据应来自 enrollment 和评价系统
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");
const fs = require("fs");
const path = require("path");

function loadEnv(file) {
  const p = path.join(__dirname, "..", file);
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, "utf-8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2];
    }
  }
}
loadEnv(".env.local");
loadEnv(".env");

function createAdapter() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl && tursoUrl !== "undefined") {
    console.log("→ 使用 Turso 远程数据库:", tursoUrl);
    return new PrismaLibSQL({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  console.log("→ 使用本地 SQLite: file:./db/custom.db");
  return new PrismaLibSQL({ url: "file:./db/custom.db" });
}

async function main() {
  const p = new PrismaClient({ adapter: createAdapter() });
  try {
    const courses = await p.course.findMany({
      select: { id: true, title: true, studentsCount: true, rating: true, ratingCount: true },
    });
    console.log(`找到 ${courses.length} 门课程，正在清理假数据...`);
    for (const c of courses) {
      console.log(`  ${c.title}: studentsCount=${c.studentsCount} → 0, rating=${c.rating} → 0, ratingCount=${c.ratingCount} → 0`);
      await p.course.update({
        where: { id: c.id },
        data: {
          studentsCount: 0,
          rating: 0,
          ratingCount: 0,
        },
      });
    }
    console.log("✅ 所有课程的假数据已清零");
  } finally {
    await p.$disconnect();
  }
}

main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});
