import { prisma } from "@/lib/prisma"

export type CompanyAccessStatus =
  | { blocked: false; reason: null }
  | { blocked: true; reason: "suspendida" | "vencida" }

export async function getCompanyAccessStatus(companyId: number): Promise<CompanyAccessStatus> {
  const company = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: {
      activo: true,
      paquetes: {
        where: { activo: true },
        select: { fecha_vencimiento: true },
        take: 1,
      },
    },
  })

  if (!company) return { blocked: false, reason: null }
  if (!company.activo) return { blocked: true, reason: "suspendida" }

  const expirationDate = company.paquetes[0]?.fecha_vencimiento ?? null
  if (expirationDate && expirationDate < new Date()) {
    return { blocked: true, reason: "vencida" }
  }

  return { blocked: false, reason: null }
}
