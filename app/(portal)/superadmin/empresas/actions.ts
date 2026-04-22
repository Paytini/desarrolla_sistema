"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function getPositiveInt(formData: FormData, key: string) {
  return Number.parseInt(String(formData.get(key) ?? "0"), 10)
}

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user.rol !== "SUPERADMIN") {
    redirect("/login")
  }
}

export async function createCompanyAction(formData: FormData) {
  await requireSuperAdmin()

  const nombre = getString(formData, "nombre")
  const emailRh = getString(formData, "email_rh").toLowerCase()
  const telefono = getString(formData, "telefono")
  const rfc = getString(formData, "rfc")
  const asientosContratados = getPositiveInt(formData, "asientos_contratados")
  const nombreRh = getString(formData, "nombre_rh")
  const passwordRh = getString(formData, "password_rh")
  const notas = getString(formData, "notas")
  const paqueteIdRaw = getString(formData, "paquete_id")
  const fechaVencimientoRaw = getString(formData, "fecha_vencimiento")

  if (!nombre || !emailRh || !nombreRh || !passwordRh || asientosContratados < 1) {
    redirect("/superadmin/empresas?error=datos")
  }

  const existingCompany = await prisma.empresa.findUnique({
    where: { email_rh: emailRh },
    select: { id: true },
  })

  if (existingCompany) {
    redirect("/superadmin/empresas?error=email_rh")
  }

  const existingUser = await prisma.usuario.findUnique({
    where: { email: emailRh },
    select: { id: true },
  })

  if (existingUser) {
    redirect("/superadmin/empresas?error=usuario_rh")
  }

  const passwordHash = await bcrypt.hash(passwordRh, 12)
  const paqueteId = paqueteIdRaw ? Number.parseInt(paqueteIdRaw, 10) : NaN
  const fechaVencimiento = fechaVencimientoRaw ? new Date(fechaVencimientoRaw) : null

  await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: {
        nombre,
        email_rh: emailRh,
        telefono: telefono || null,
        rfc: rfc || null,
        asientos_contratados: asientosContratados,
        notas: notas || null,
      },
    })

    await tx.usuario.create({
      data: {
        email: emailRh,
        password_hash: passwordHash,
        nombre: nombreRh,
        rol: "RH",
        empresa_id: empresa.id,
      },
    })

    if (Number.isInteger(paqueteId)) {
      await tx.empresaPaquete.create({
        data: {
          empresa_id: empresa.id,
          paquete_id: paqueteId,
          fecha_vencimiento: fechaVencimiento,
          activo: true,
        },
      })
    }
  })

  revalidatePath("/superadmin/empresas")
  redirect("/superadmin/empresas?success=empresa_creada")
}

export async function toggleCompanyStatusAction(formData: FormData) {
  await requireSuperAdmin()

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

  revalidatePath("/superadmin/empresas")
  redirect(`/superadmin/empresas?success=${empresa.activo ? "empresa_suspendida" : "empresa_activada"}`)
}
