import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import path from 'path'

/**
 * 数据库接入层：生产用 Turso(libSQL) 远程数据库，本地开发可用 SQLite 文件。
 *
 * 为什么用 Turso：Vercel serverless 文件系统只读，SQLite 文件无法持久化写入，
 * 注册/文案落库/报名等写操作会丢失或失败。Turso 是基于 libSQL 的 serverless
 * 数据库，走 HTTP 协议、天然适配 serverless，读写都持久。
 *
 * 环境变量：
 * - 生产：TURSO_DATABASE_URL（libsql://xxx.turso.io）+ TURSO_AUTH_TOKEN
 * - 回退：使用 PrismaLibSQL 连接本地 SQLite 文件（libSQL 兼容 SQLite 文件）
 */
function createAdapter() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  if (tursoUrl && tursoUrl !== 'undefined') {
    // 生产：Turso 远程库
    return new PrismaLibSQL({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  // 回退：使用 PrismaLibSQL 连接本地 SQLite 文件
  // Vercel (Unix) 上用绝对路径，Windows 本地用相对路径
  const isWindows = process.platform === 'win32'
  const dbUrl = isWindows
    ? 'file:./db/custom.db'
    : `file:${path.join(process.cwd(), 'db', 'custom.db')}`
  return new PrismaLibSQL({ url: dbUrl })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    adapter: createAdapter(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
