import { prisma } from "@/lib/prisma"

export type EmpresaAccessStatus =
  | { blocked: false; reason: null }
  | { blocked: true; reason: "suspendida" | "vencida" }

export async function getEmpresaAccessStatus(empresaId: number): Promise<EmpresaAccessStatus> {
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

  // La FK Usuario.empresa_id -> Empresa.id garantiza que empresa exista;
  // esta rama es defensiva para que el tipo de retorno de Prisma compile.
  if (!empresa) return { blocked: false, reason: null }
  if (!empresa.activo) return { blocked: true, reason: "suspendida" }

  const fechaVencimiento = empresa.paquetes[0]?.fecha_vencimiento ?? null
  if (fechaVencimiento && fechaVencimiento < new Date()) {
    return { blocked: true, reason: "vencida" }
  }

  return { blocked: false, reason: null }
}
