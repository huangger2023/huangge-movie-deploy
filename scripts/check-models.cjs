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

const tu = process.env.TURSO_DATABASE_URL;
const ad = new PrismaLibSQL({ url: tu, authToken: process.env.TURSO_AUTH_TOKEN });
const db = new PrismaClient({ adapter: ad });

async function main() {
  const adminModels = await db.aiModel.findMany({ orderBy: { createdAt: "asc" } });
  console.log("=== 管理员全局模型 ===");
  console.log("共 " + adminModels.length + " 个:");
  adminModels.forEach((m) => {
    console.log("  - name: " + m.name + " | model: " + m.model + " | baseUrl: " + m.baseUrl + " | isDefault: " + m.isDefault + " | isActive: " + m.isActive);
  });

  const userModels = await db.userAiModel.findMany({ orderBy: { createdAt: "asc" } });
  console.log("\n=== 用户自定义模型 ===");
  console.log("共 " + userModels.length + " 个:");
  userModels.forEach((m) => {
    console.log("  - name: " + m.name + " | model: " + m.model + " | baseUrl: " + m.baseUrl + " | userId: " + m.userId + " | isActive: " + m.isActive);
  });
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
