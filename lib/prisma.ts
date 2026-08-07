import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { getActiveCompanyId } from "@/lib/tenant-context"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  prismaPool?: Pool
}

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })

// Models that carry a direct company_id column. Any query against them, while an
// RH request is active (see lib/tenant-context.ts), gets company_id forced onto
// where/data — a safety net in case a query is ever written without it by hand.
const TENANT_SCOPED_MODELS = new Set(["Employee", "CompanyPackage", "ConsultingRequest"])

const WHERE_SCOPED_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "delete",
  "updateMany",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
])

function tenantGuardedClient(client: PrismaClient) {
  return client.$extends({
    name: "tenant-guard",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) return query(args)

          const companyId = getActiveCompanyId()
          if (companyId == null) return query(args)

          const scoped: Record<string, unknown> = { ...(args as Record<string, unknown>) }

          if (WHERE_SCOPED_OPERATIONS.has(operation)) {
            scoped.where = { ...((args as { where?: object }).where ?? {}), company_id: companyId }
          } else if (operation === "create") {
            scoped.data = { ...((args as { data?: object }).data ?? {}), company_id: companyId }
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            const data = (args as { data?: unknown }).data
            scoped.data = Array.isArray(data)
              ? data.map((row) => ({ ...(row as object), company_id: companyId }))
              : data
          } else if (operation === "upsert") {
            const upsertArgs = args as { where?: object; create?: object }
            scoped.where = { ...(upsertArgs.where ?? {}), company_id: companyId }
            scoped.create = { ...(upsertArgs.create ?? {}), company_id: companyId }
          }

          return query(scoped)
        },
      },
    },
  })
}

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

export const prisma = tenantGuardedClient(basePrisma) as unknown as PrismaClient

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma
  globalForPrisma.prismaPool = pool
}
