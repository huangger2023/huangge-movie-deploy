// 一次性维护脚本：配置管理员账号 + 清理 demo 体验账号
// 使用与 db.ts 相同的适配器逻辑：优先 Turso，否则本地 SQLite
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

// 加载 .env.local（Vercel CLI 生成），手动 parse
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

const ADMIN_EMAIL = "254592382@qq.com";
const ADMIN_PASSWORD = "hgsdy2023@2023";
const DEMO_EMAIL = "demo@yingshu.com";
const OLD_ADMIN_EMAIL = "admin@yingshu.com"; // 旧管理员，随新管理员一起清理

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
    // 1. upsert 管理员账号
    const admin = await p.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        password: ADMIN_PASSWORD,
        role: "ADMIN",
        name: "荒哥",
      },
      create: {
        email: ADMIN_EMAIL,
        name: "荒哥",
        password: ADMIN_PASSWORD,
        role: "ADMIN",
        bio: "专注抖音电影解说教学，课程覆盖选片、拆片、文案、配音、发布与复盘。",
        avatar: null,
      },
    });
    console.log("✅ 管理员账号已就绪:", admin.email, "| role:", admin.role);

    // 2. 删除 demo 体验账号与旧管理员账号（关联数据靠外键 onDelete: Cascade 自动清理）
    const deleted = await p.user.deleteMany({
      where: { email: { in: [DEMO_EMAIL, OLD_ADMIN_EMAIL] } },
    });
    console.log("已删除 demo / 旧管理员账号,数量:", deleted.count);
  } finally {
    await p.$disconnect();
  }
}

main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});
