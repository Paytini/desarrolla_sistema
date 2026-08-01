import { prisma } from "@/lib/prisma"

export type CompanyAccessStatus =
  | { blocked: false; reason: null }
  | { blocked: true; reason: "suspendida" | "vencida" }

export async function getCompanyAccessStatus(companyId: number): Promise<CompanyAccessStatus> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      active: true,
      packages: {
        where: { active: true },
        select: { expiration_date: true },
        take: 1,
      },
    },
  })

  if (!company) return { blocked: false, reason: null }
  if (!company.active) return { blocked: true, reason: "suspendida" }

  const expirationDate = company.packages[0]?.expiration_date ?? null
  if (expirationDate && expirationDate < new Date()) {
    return { blocked: true, reason: "vencida" }
  }

  return { blocked: false, reason: null }
}
