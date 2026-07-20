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
  const asientosContratados   = getPositiveInt(formData, "asientos_contratados")
  const nombreRh              = getString(formData, "nombre_rh")
  const passwordRh            = getString(formData, "password_rh")
  const notas                 = getString(formData, "notas")
  const paqueteIdRaw          = getString(formData, "paquete_id")
  const fechaVencimientoRaw   = getString(formData, "fecha_vencimiento")

  if (!nombre || !emailRh || !nombreRh || !passwordRh || asientosContratados < 1) {
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
  const paqueteId     = paqueteIdRaw ? Number.parseInt(paqueteIdRaw, 10) : NaN
  const fechaVencimiento = (() => {
    if (!fechaVencimientoRaw) return null
    const d = new Date(fechaVencimientoRaw)
    return isNaN(d.getTime()) ? null : d
  })()

  const createdResult = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: {
        nombre,
        email_rh:              emailRh,
        telefono:              telefono || null,
        rfc:                   rfc || null,
        asientos_contratados:  asientosContratados,
        notas:                 notas || null,
      },
    })

    await tx.usuario.create({
      data: {
        email:         emailRh,
        password_hash: passwordHash,
        nombre:        nombreRh,
        rol:           "RH",
        empresa_id:    empresa.id,
      },
    })

    let assignedPackageId: number | null = null
    if (Number.isInteger(paqueteId)) {
      await tx.empresaPaquete.create({
        data: {
          empresa_id:        empresa.id,
          paquete_id:        paqueteId,
          fecha_vencimiento: fechaVencimiento,
          activo:            true,
        },
      })
      assignedPackageId = paqueteId
    }

    return { empresaId: empresa.id, assignedPackageId }
  })

  const seatSnapshot = await getCompanySeatSnapshot(createdResult.empresaId)
  if (seatSnapshot) {
    await createSeatHistoryEntry({
      actor,
      empresaId: createdResult.empresaId,
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
    entidadId:   createdResult.empresaId,
    empresaId:   createdResult.empresaId,
    resumen:     `Se creo la empresa ${nombre} y su acceso RH inicial.`,
    metadata: {
      email_rh:              emailRh,
      asientos_contratados:  asientosContratados,
      paquete_inicial_id:    createdResult.assignedPackageId,
    },
  })

  if (createdResult.assignedPackageId) {
    await createAuditEvent({
      actor,
      accion:      "PAQUETE_ASIGNADO",
      entidadTipo: "EMPRESA_PAQUETE",
      entidadId:   createdResult.assignedPackageId,
      empresaId:   createdResult.empresaId,
      resumen:     `Se asigno paquete inicial a la empresa ${nombre}.`,
      metadata: {
        paquete_id:        createdResult.assignedPackageId,
        fecha_vencimiento: fechaVencimiento?.toISOString() ?? null,
      },
    })
  }

  await notifySuperadmins({
    tipo:       "EMPRESA_CREADA",
    titulo:     "Nueva empresa registrada",
    mensaje:    `${actor.nombre} creó la empresa ${nombre}.`,
    entidadTipo: "EMPRESA",
    entidadId:  createdResult.empresaId,
    excludeUsuarioId: actor.usuarioId,
  })

  revalidatePath("/superadmin/empresas")
  revalidatePath("/superadmin/reportes")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(empresaCacheRootTag(createdResult.empresaId), "max")
  redirect("/superadmin/empresas?success=empresa_creada")
}

export async function toggleCompanyStatusAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const empresaId = Number.parseInt(String(formData.get("empresa_id") ?? "0"), 10)
  if (!empresaId) {
    redirect("/superadmin/empresas?error=empresa")
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { activo: true, nombre: true },
  })

  if (!empresa) {
    redirect("/superadmin/empresas?error=empresa")
  }

  await prisma.empresa.update({
    where: { id: empresaId },
    data: { activo: !empresa.activo },
  })

  await createAuditEvent({
    actor,
    accion: empresa.activo ? "EMPRESA_SUSPENDIDA" : "EMPRESA_REACTIVADA",
    entidadTipo: "EMPRESA",
    entidadId: empresaId,
    empresaId,
    resumen: `${actor.nombre} ${empresa.activo ? "suspendio" : "reactivo"} la empresa ${empresa.nombre}.`,
  })

  await notifySuperadmins({
    tipo:       empresa.activo ? "EMPRESA_SUSPENDIDA" : "EMPRESA_REACTIVADA",
    titulo:     empresa.activo ? "Empresa suspendida" : "Empresa reactivada",
    mensaje:    `${actor.nombre} ${empresa.activo ? "suspendió" : "reactivó"} la empresa ${empresa.nombre}.`,
    entidadTipo: "EMPRESA",
    entidadId:  empresaId,
    excludeUsuarioId: actor.usuarioId,
  })

  revalidatePath("/superadmin/empresas")
  revalidatePath("/superadmin/reportes")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(empresaCacheRootTag(empresaId), "max")
  redirect(`/superadmin/empresas?success=${empresa.activo ? "empresa_suspendida" : "empresa_activada"}`)
}

