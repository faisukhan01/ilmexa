import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (url && authToken) {
    // PrismaLibSql is a factory in v7 — pass config directly, not a pre-created client
    const adapter = new PrismaLibSql({ url, authToken })
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
    } as any)
  }

  // Fallback to local SQLite for local dev (without Turso)
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'file:./db/custom.db',
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
