import { prisma } from "@/lib/prisma"

export type CompanyAccessStatus =
  | { blocked: false; reason: null }
  | { blocked: true; reason: "suspendida" | "vencida" }

export async function getCompanyAccessStatus(empresaId: number): Promise<CompanyAccessStatus> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      activo: true,
      paquetes: {
        where: { activo: true },
        select: { fecha_vencimiento: true },
        take: 1,
      },
    },
  })

  if (!empresa) return { blocked: false, reason: null }
  if (!empresa.activo) return { blocked: true, reason: "suspendida" }

  const fechaVencimiento = empresa.paquetes[0]?.fecha_vencimiento ?? null
  if (fechaVencimiento && fechaVencimiento < new Date()) {
    return { blocked: true, reason: "vencida" }
  }

  return { blocked: false, reason: null }
}
