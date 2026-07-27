import { AsyncLocalStorage } from "node:async_hooks"

// Holds the active RH user's company_id for the lifetime of a request/action,
// so the Prisma tenant guard (see lib/prisma.ts) can scope queries automatically.
const companyContext = new AsyncLocalStorage<number>()

export function enterCompanyContext(companyId: number): void {
  companyContext.enterWith(companyId)
}

export function getActiveCompanyId(): number | null {
  return companyContext.getStore() ?? null
}

// Escape hatch for the rare query that must legitimately look across all
// companies (e.g. checking a globally-unique email) while an RH request is active.
export function withoutCompanyContext<T>(fn: () => T): T {
  return companyContext.exit(fn)
}
