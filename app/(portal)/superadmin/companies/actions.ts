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
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
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

  const existingCompany = await prisma.company.findUnique({
    where: { hr_email: emailRh },
    select: { id: true },
  })
  if (existingCompany) return { error: "email_rh" }

  const existingUser = await prisma.user.findUnique({
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
    const company = await tx.company.create({
      data: {
        name:              nombre,
        hr_email:          emailRh,
        phone:             telefono || null,
        rfc:               rfc || null,
        contracted_seats:  contractedSeats,
        notes:             notas || null,
      },
    })

    await tx.user.create({
      data: {
        email:         emailRh,
        password_hash: passwordHash,
        name:          nombreRh,
        role:          "RH",
        company_id:    company.id,
      },
    })

    let assignedPackageId: number | null = null
    if (Number.isInteger(packageId)) {
      await tx.companyPackage.create({
        data: {
          company_id:       company.id,
          package_id:       packageId,
          expiration_date:  expirationDate,
          active:           true,
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
      companyId: createdResult.companyId,
      motivo:   "empresa_creada",
      detalle:  "Se inicializaron los cupos al crear la empresa en SuperAdmin.",
      before: { asientos_contratados: 0, asientos_usados: 0, empleados_suspendidos: 0 },
      after:  seatSnapshot,
    })
  }

  await createAuditEvent({
    actor,
    accion:    "EMPRESA_CREADA",
    entityType: "EMPRESA",
    entityId:  createdResult.companyId,
    companyId: createdResult.companyId,
    resumen:   `Se creo la empresa ${nombre} y su acceso RH inicial.`,
    metadata: {
      email_rh:              emailRh,
      asientos_contratados:  contractedSeats,
      paquete_inicial_id:    createdResult.assignedPackageId,
    },
  })

  if (createdResult.assignedPackageId) {
    await createAuditEvent({
      actor,
      accion:    "PAQUETE_ASIGNADO",
      entityType: "EMPRESA_PAQUETE",
      entityId:  createdResult.assignedPackageId,
      companyId: createdResult.companyId,
      resumen:   `Se asigno paquete inicial a la empresa ${nombre}.`,
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
    excludeUsuarioId: actor.userId,
  })

  revalidatePath("/superadmin/companies")
  revalidatePath("/superadmin/reports")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(companyCacheRootTag(createdResult.companyId), "max")
  redirect("/superadmin/companies?success=empresa_creada")
}

export async function toggleCompanyStatusAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const companyId = Number.parseInt(String(formData.get("empresa_id") ?? "0"), 10)
  if (!companyId) {
    redirect("/superadmin/companies?error=empresa")
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { active: true, name: true },
  })

  if (!company) {
    redirect("/superadmin/companies?error=empresa")
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { active: !company.active },
  })

  await createAuditEvent({
    actor,
    accion: company.active ? "EMPRESA_SUSPENDIDA" : "EMPRESA_REACTIVADA",
    entityType: "EMPRESA",
    entityId: companyId,
    companyId,
    resumen: `${actor.nombre} ${company.active ? "suspendio" : "reactivo"} la empresa ${company.name}.`,
  })

  await notifySuperadmins({
    tipo:       company.active ? "EMPRESA_SUSPENDIDA" : "EMPRESA_REACTIVADA",
    titulo:     company.active ? "Empresa suspendida" : "Empresa reactivada",
    mensaje:    `${actor.nombre} ${company.active ? "suspendió" : "reactivó"} la empresa ${company.name}.`,
    entidadTipo: "EMPRESA",
    entidadId:  companyId,
    excludeUsuarioId: actor.userId,
  })

  revalidatePath("/superadmin/companies")
  revalidatePath("/superadmin/reports")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(companyCacheRootTag(companyId), "max")
  redirect(`/superadmin/companies?success=${company.active ? "empresa_suspendida" : "empresa_activada"}`)
}

