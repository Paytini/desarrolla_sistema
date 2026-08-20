import { AsyncLocalStorage } from "node:async_hooks"

// Holds the active HR user's company_id for the lifetime of a request/action,
// so the Prisma tenant guard (see lib/prisma.ts) can scope queries automatically.
const companyContext = new AsyncLocalStorage<string>()

export function enterCompanyContext(companyId: string): void {
  companyContext.enterWith(companyId)
}

export function getActiveCompanyId(): string | null {
  return companyContext.getStore() ?? null
}

// Escape hatch for the rare query that must legitimately look across all
// companies (e.g. checking a globally-unique email) while an HR request is active.
export function withoutCompanyContext<T>(fn: () => T): T {
  return companyContext.exit(fn)
}
