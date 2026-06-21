// 一次性维护脚本：配置管理员账号 + 清理 demo 体验账号
// 只动这两条记录，不触碰课程/学员/报名等其他数据。
// 运行后更新本地 custom.db，随部署打包上线（绕过 Vercel 只读 FS 限制）。
const { PrismaClient } = require("@prisma/client");

const ADMIN_EMAIL = "254592382@qq.com";
const ADMIN_PASSWORD = "hgsdy2023@2023";
const DEMO_EMAIL = "demo@yingshu.com";
const OLD_ADMIN_EMAIL = "admin@yingshu.com"; // 旧管理员，随新管理员一起清理

async function main() {
  const p = new PrismaClient();
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
    console.log("管理员账号已就绪:", admin.email, "| role:", admin.role);

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
