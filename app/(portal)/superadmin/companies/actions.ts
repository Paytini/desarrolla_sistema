"use server"

import bcrypt from "bcryptjs"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  createAuditEvent,
  createSeatHistoryEntry,
  getAuditActorFromSession,
  getCompanySeatSnapshot,
} from "@/lib/auditing"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, empresaCacheRootTag } from "@/lib/cache-tags"
import { notifySuperadmins } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function getPositiveInt(formData: FormData, key: string) {
  return Number.parseInt(String(formData.get(key) ?? "0"), 10)
}

export async function createCompanyAction(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const nombre                = getString(formData, "nombre")
  const emailRh               = getString(formData, "email_rh").toLowerCase()
  const telefono              = getString(formData, "telefono")
  const rfc                   = getString(formData, "rfc")
  const contractedSeats       = getPositiveInt(formData, "asientos_contratados")
  const nombreRh              = getString(formData, "nombre_rh")
  const passwordRh            = getString(formData, "password_rh")
  const notas                 = getString(formData, "notas")
  const packageIdRaw          = getString(formData, "paquete_id")
  const expirationDateRaw     = getString(formData, "fecha_vencimiento")

  if (!nombre || !emailRh || !nombreRh || !passwordRh || contractedSeats < 1) {
    return { error: "datos" }
  }

  const existingCompany = await prisma.empresa.findUnique({
    where: { email_rh: emailRh },
    select: { id: true },
  })
  if (existingCompany) return { error: "email_rh" }

  const existingUser = await prisma.usuario.findUnique({
    where: { email: emailRh },
    select: { id: true },
  })
  if (existingUser) return { error: "usuario_rh" }

  const passwordHash  = await bcrypt.hash(passwordRh, 12)
  const packageId     = packageIdRaw ? Number.parseInt(packageIdRaw, 10) : NaN
  const expirationDate = (() => {
    if (!expirationDateRaw) return null
    const d = new Date(expirationDateRaw)
    return isNaN(d.getTime()) ? null : d
  })()

  const createdResult = await prisma.$transaction(async (tx) => {
    const company = await tx.empresa.create({
      data: {
        nombre,
        email_rh:              emailRh,
        telefono:              telefono || null,
        rfc:                   rfc || null,
        asientos_contratados:  contractedSeats,
        notas:                 notas || null,
      },
    })

    await tx.usuario.create({
      data: {
        email:         emailRh,
        password_hash: passwordHash,
        nombre:        nombreRh,
        rol:           "RH",
        empresa_id:    company.id,
      },
    })

    let assignedPackageId: number | null = null
    if (Number.isInteger(packageId)) {
      await tx.empresaPaquete.create({
        data: {
          empresa_id:        company.id,
          paquete_id:        packageId,
          fecha_vencimiento: expirationDate,
          activo:            true,
        },
      })
      assignedPackageId = packageId
    }

    return { companyId: company.id, assignedPackageId }
  })

  const seatSnapshot = await getCompanySeatSnapshot(createdResult.companyId)
  if (seatSnapshot) {
    await createSeatHistoryEntry({
      actor,
      empresaId: createdResult.companyId,
      motivo:   "empresa_creada",
      detalle:  "Se inicializaron los cupos al crear la empresa en SuperAdmin.",
      before: { asientos_contratados: 0, asientos_usados: 0, empleados_suspendidos: 0 },
      after:  seatSnapshot,
    })
  }

  await createAuditEvent({
    actor,
    accion:      "EMPRESA_CREADA",
    entidadTipo: "EMPRESA",
    entidadId:   createdResult.companyId,
    empresaId:   createdResult.companyId,
    resumen:     `Se creo la empresa ${nombre} y su acceso RH inicial.`,
    metadata: {
      email_rh:              emailRh,
      asientos_contratados:  contractedSeats,
      paquete_inicial_id:    createdResult.assignedPackageId,
    },
  })

  if (createdResult.assignedPackageId) {
    await createAuditEvent({
      actor,
      accion:      "PAQUETE_ASIGNADO",
      entidadTipo: "EMPRESA_PAQUETE",
      entidadId:   createdResult.assignedPackageId,
      empresaId:   createdResult.companyId,
      resumen:     `Se asigno paquete inicial a la empresa ${nombre}.`,
      metadata: {
        paquete_id:        createdResult.assignedPackageId,
        fecha_vencimiento: expirationDate?.toISOString() ?? null,
      },
    })
  }

  await notifySuperadmins({
    tipo:       "EMPRESA_CREADA",
    titulo:     "Nueva empresa registrada",
    mensaje:    `${actor.nombre} creó la empresa ${nombre}.`,
    entidadTipo: "EMPRESA",
    entidadId:  createdResult.companyId,
    excludeUsuarioId: actor.usuarioId,
  })

  revalidatePath("/superadmin/companies")
  revalidatePath("/superadmin/reports")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(empresaCacheRootTag(createdResult.companyId), "max")
  redirect("/superadmin/companies?success=empresa_creada")
}

export async function toggleCompanyStatusAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const companyId = Number.parseInt(String(formData.get("empresa_id") ?? "0"), 10)
  if (!companyId) {
    redirect("/superadmin/companies?error=empresa")
  }

  const company = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: { activo: true, nombre: true },
  })

  if (!company) {
    redirect("/superadmin/companies?error=empresa")
  }

  await prisma.empresa.update({
    where: { id: companyId },
    data: { activo: !company.activo },
  })

  await createAuditEvent({
    actor,
    accion: company.activo ? "EMPRESA_SUSPENDIDA" : "EMPRESA_REACTIVADA",
    entidadTipo: "EMPRESA",
    entidadId: companyId,
    empresaId: companyId,
    resumen: `${actor.nombre} ${company.activo ? "suspendio" : "reactivo"} la empresa ${company.nombre}.`,
  })

  await notifySuperadmins({
    tipo:       company.activo ? "EMPRESA_SUSPENDIDA" : "EMPRESA_REACTIVADA",
    titulo:     company.activo ? "Empresa suspendida" : "Empresa reactivada",
    mensaje:    `${actor.nombre} ${company.activo ? "suspendió" : "reactivó"} la empresa ${company.nombre}.`,
    entidadTipo: "EMPRESA",
    entidadId:  companyId,
    excludeUsuarioId: actor.usuarioId,
  })

  revalidatePath("/superadmin/companies")
  revalidatePath("/superadmin/reports")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(empresaCacheRootTag(companyId), "max")
  redirect(`/superadmin/companies?success=${company.activo ? "empresa_suspendida" : "empresa_activada"}`)
}

