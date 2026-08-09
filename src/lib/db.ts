import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Read DATABASE_URL at runtime so the standalone build uses the .env on the server,
// not the value baked in during `next build`.
const runtimeDbUrl = process.env.DATABASE_URL

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    ...(runtimeDbUrl ? { datasourceUrl: runtimeDbUrl } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
