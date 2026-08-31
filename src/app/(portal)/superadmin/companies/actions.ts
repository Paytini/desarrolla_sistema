"use server"

import bcrypt from "bcrypt"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { after } from "next/server"
import {
  createAuditEvent,
  createSeatHistoryEntry,
  getAuditActorFromSession,
  getCompanySeatSnapshot,
} from "@/lib/auditing"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
import {
  COMPANY_LOGO_ALLOWED_TYPES,
  COMPANY_LOGO_MAX_SIZE_BYTES,
  uploadCompanyLogo,
} from "@/lib/company/logo"
import { companyPath } from "@/lib/company/routes"
import { notifySuperadmins } from "@/lib/notifications"
import { enqueueEmailSendJob } from "@/lib/jobs"
import { prisma } from "@/lib/prisma"
import { ensureUniqueCompanySlug } from "@/lib/slug"
import { buildCredentialsEmail } from "@/lib/email-templates/credentials"
import { isUuid } from "@/lib/uuid"

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

  const nombre = getString(formData, "nombre")
  const emailHr = getString(formData, "email_hr").toLowerCase()
  const telefono = getString(formData, "telefono")
  const rfc = getString(formData, "rfc")
  const contractedSeats = getPositiveInt(formData, "asientos_contratados")
  const nombreHr = getString(formData, "nombre_hr")
  const passwordHr = getString(formData, "password_hr")
  const notas = getString(formData, "notas")
  const packageIdRaw = getString(formData, "paquete_id")
  const expirationDateRaw = getString(formData, "fecha_vencimiento")
  const logoFileEntry = formData.get("logo")
  const logoFile = logoFileEntry instanceof File && logoFileEntry.size > 0 ? logoFileEntry : null

  if (!nombre || !emailHr || !nombreHr || !passwordHr || contractedSeats < 1) {
    return { error: "datos" }
  }

  if (packageIdRaw && !isUuid(packageIdRaw)) {
    return { error: "datos" }
  }

  if (
    logoFile &&
    (!COMPANY_LOGO_ALLOWED_TYPES.includes(logoFile.type) ||
      logoFile.size > COMPANY_LOGO_MAX_SIZE_BYTES)
  ) {
    return { error: "logo" }
  }

  const existingCompany = await prisma.company.findUnique({
    where: { hr_email: emailHr },
    select: { id: true },
  })
  if (existingCompany) return { error: "email_hr" }

  const existingUser = await prisma.user.findUnique({
    where: { email: emailHr },
    select: { id: true },
  })
  if (existingUser) return { error: "usuario_hr" }

  const passwordHash = await bcrypt.hash(passwordHr, 12)
  const packageId = packageIdRaw || null
  const expirationDate = (() => {
    if (!expirationDateRaw) return null
    const d = new Date(expirationDateRaw)
    return isNaN(d.getTime()) ? null : d
  })()
  const slug = await ensureUniqueCompanySlug(nombre)

  const createdResult = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: nombre,
        slug,
        hr_email: emailHr,
        phone: telefono || null,
        rfc: rfc || null,
        contracted_seats: contractedSeats,
        notes: notas || null,
      },
    })

    await tx.user.create({
      data: {
        email: emailHr,
        password_hash: passwordHash,
        name: nombreHr,
        role: "HR",
        company_id: company.id,
      },
    })

    let assignedPackageId: string | null = null
    if (packageId) {
      await tx.companyPackage.create({
        data: {
          company_id: company.id,
          package_id: packageId,
          expiration_date: expirationDate,
          active: true,
        },
      })
      assignedPackageId = packageId
    }

    return { companyId: company.id, assignedPackageId }
  })

  let emailQueued = false
  let emailError: string | null = null

  try {
    const { subject, html, text } = buildCredentialsEmail({
      nombreHr,
      nombreEmpresa: nombre,
      email: emailHr,
      password: passwordHr,
    })
    await enqueueEmailSendJob({ to: emailHr, subject, html, text })
    emailQueued = true
  } catch (error) {
    emailError = error instanceof Error ? error.message : String(error)
  }

  after(async () => {
    try {
      const seatSnapshot = await getCompanySeatSnapshot(createdResult.companyId)
      if (seatSnapshot) {
        await createSeatHistoryEntry({
          actor,
          companyId: createdResult.companyId,
          motivo: "empresa_creada",
          detalle: "Se inicializaron los cupos al crear la empresa en SuperAdmin.",
          before: { asientos_contratados: 0, asientos_usados: 0, empleados_suspendidos: 0 },
          after: seatSnapshot,
        })
      }
    } catch (error) {
      console.error("createCompanyAction seat history failed", { error })
    }

    await createAuditEvent({
      actor,
      accion: "EMPRESA_CREADA",
      entityType: "EMPRESA",
      entityId: createdResult.companyId,
      companyId: createdResult.companyId,
      resumen: `Se creo la empresa ${nombre} y su acceso HR inicial.`,
      metadata: {
        email_hr: emailHr,
        asientos_contratados: contractedSeats,
        paquete_inicial_id: createdResult.assignedPackageId,
      },
    })

    await createAuditEvent({
      actor,
      accion: emailQueued ? "EMAIL_CREDENCIALES_ENCOLADO" : "EMAIL_CREDENCIALES_FALLIDO",
      entityType: "EMPRESA",
      entityId: createdResult.companyId,
      companyId: createdResult.companyId,
      resumen: emailQueued
        ? `Se encolo el correo de credenciales para ${emailHr}.`
        : `No se pudo encolar el correo de credenciales para ${emailHr}.`,
      metadata: emailError ? { error: emailError } : undefined,
    })

    if (createdResult.assignedPackageId) {
      await createAuditEvent({
        actor,
        accion: "PAQUETE_ASIGNADO",
        entityType: "EMPRESA_PAQUETE",
        entityId: createdResult.assignedPackageId,
        companyId: createdResult.companyId,
        resumen: `Se asigno paquete inicial a la empresa ${nombre}.`,
        metadata: {
          paquete_id: createdResult.assignedPackageId,
          fecha_vencimiento: expirationDate?.toISOString() ?? null,
        },
      })
    }

    await notifySuperadmins({
      tipo: "EMPRESA_CREADA",
      titulo: "Nueva empresa registrada",
      mensaje: `${actor.nombre} creó la empresa ${nombre}.`,
      entidadTipo: "EMPRESA",
      entidadId: createdResult.companyId,
      excludeUsuarioId: actor.userId,
    })

    if (logoFile) {
      try {
        const logoUrl = await uploadCompanyLogo(createdResult.companyId, logoFile)
        await prisma.company.update({
          where: { id: createdResult.companyId },
          data: { logo_url: logoUrl },
        })
        revalidateTag(companyCacheRootTag(createdResult.companyId), "max")
      } catch (error) {
        console.error("createCompanyAction logo upload failed", {
          companyId: createdResult.companyId,
          error,
        })
      }
    }
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

  const companyId = String(formData.get("empresa_id") ?? "").trim()
  if (!companyId || !isUuid(companyId)) {
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

  after(async () => {
    await createAuditEvent({
      actor,
      accion: company.active ? "EMPRESA_SUSPENDIDA" : "EMPRESA_REACTIVADA",
      entityType: "EMPRESA",
      entityId: companyId,
      companyId,
      resumen: `${actor.nombre} ${company.active ? "suspendio" : "reactivo"} la empresa ${company.name}.`,
    })

    await notifySuperadmins({
      tipo: company.active ? "EMPRESA_SUSPENDIDA" : "EMPRESA_REACTIVADA",
      titulo: company.active ? "Empresa suspendida" : "Empresa reactivada",
      mensaje: `${actor.nombre} ${company.active ? "suspendió" : "reactivó"} la empresa ${company.name}.`,
      entidadTipo: "EMPRESA",
      entidadId: companyId,
      excludeUsuarioId: actor.userId,
    })
  })

  revalidatePath("/superadmin/companies")
  revalidatePath("/superadmin/reports")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(companyCacheRootTag(companyId), "max")
  redirect(
    `/superadmin/companies?success=${company.active ? "empresa_suspendida" : "empresa_activada"}`,
  )
}

export async function updateCompanyBrandingAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const companyId = String(formData.get("empresa_id") ?? "").trim()
  const logoUrl = getString(formData, "logo_url")

  if (!companyId || !isUuid(companyId)) {
    redirect("/superadmin/companies?error=empresa")
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data: { logo_url: logoUrl || null },
    select: { name: true, slug: true },
  })

  after(async () => {
    await createAuditEvent({
      actor,
      accion: "EMPRESA_MARCA_ACTUALIZADA",
      entityType: "EMPRESA",
      entityId: companyId,
      companyId,
      resumen: `${actor.nombre} actualizo el logo de la empresa ${company.name}.`,
      metadata: { tiene_logo: Boolean(logoUrl) },
    })
  })

  revalidatePath(`/superadmin/companies/${companyId}`)
  revalidatePath("/superadmin/companies")
  revalidatePath(companyPath(company.slug, "/home"))
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(companyCacheRootTag(companyId), "max")
  redirect(`/superadmin/companies/${companyId}?success=marca_actualizada`)
}
