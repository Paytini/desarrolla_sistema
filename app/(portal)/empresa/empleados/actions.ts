"use server"

import bcrypt from "bcryptjs"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { deleteEmployeeRecord } from "@/lib/access-control"
import {
  createAuditEvent,
  createSeatHistoryEntry,
  getAuditActorFromSession,
  getCompanySeatSnapshot,
  type AuditActor,
} from "@/lib/auditing"
import { requireRhSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, empresaCacheRootTag } from "@/lib/cache-tags"
import { parseCsvText } from "@/lib/csv"
import { scheduleCompanyEmployeeLearningBatch } from "@/lib/employee-learning"
import { prisma } from "@/lib/prisma"
import {
  bridgeUpsertEmployee,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"

const CSV_IMPORT_LIMIT = 200

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function sanitizeReturnTo(path: string | null | undefined) {
  const value = (path ?? "").trim()
  if (!value.startsWith("/empresa/empleados")) {
    return "/empresa/empleados"
  }

  return value
}

function withStatus(path: string, key: "success" | "error", value: string) {
  const [pathname, rawQuery = ""] = path.split("?", 2)
  const searchParams = new URLSearchParams(rawQuery)
  searchParams.set(key, value)

  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

type EmpresaProvisioningContext = {
  id: number
  nombre: string
  asientos_contratados: number
  paquetes: Array<{
    paquete: {
      modo_entrega: string
      cursos: Array<{
        wp_curso_id: number
        nombre_curso: string
      }>
    }
  }>
}

type EmployeeProvisioningInput = {
  empresaId: number
  nombre: string
  apellido: string
  email: string
  departamento?: string | null
  puesto?: string | null
  password: string
  empresaContext?: EmpresaProvisioningContext
  actor: AuditActor
}

async function loadEmpresaProvisioningContext(empresaId: number) {
  return prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nombre: true,
      asientos_contratados: true,
      paquetes: {
        where: { activo: true },
        orderBy: { created_at: "desc" },
        include: {
          paquete: {
            select: {
              modo_entrega: true,
              cursos: {
                select: {
                  wp_curso_id: true,
                  nombre_curso: true,
                },
              },
            },
          },
        },
        take: 1,
      },
    },
  })
}

async function createEmployeeForEmpresa(input: EmployeeProvisioningInput) {
  const empresaContext =
    input.empresaContext ?? (await loadEmpresaProvisioningContext(input.empresaId))

  if (!empresaContext) {
    return {
      ok: false as const,
      code: "empresa",
    }
  }

  const email = input.email.toLowerCase()

  const [existingEmployee, existingUser] = await Promise.all([
    prisma.empleado.findUnique({
      where: { email },
      select: { id: true },
    }),
    prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    }),
  ])

  if (existingEmployee || existingUser) {
    return {
      ok: false as const,
      code: "email",
    }
  }

  const [beforeSeatSnapshot, activeEmployees] = await Promise.all([
    getCompanySeatSnapshot(input.empresaId),
    prisma.empleado.count({
      where: {
        empresa_id: input.empresaId,
        activo: true,
      },
    }),
  ])

  if (!beforeSeatSnapshot) {
    return {
      ok: false as const,
      code: "empresa",
    }
  }

  if (activeEmployees >= empresaContext.asientos_contratados) {
    return {
      ok: false as const,
      code: "cupos",
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 12)
  const activePackage = empresaContext.paquetes[0]
  const hasActivePackage = Boolean(activePackage)

  const createdEmployee = await prisma.$transaction(async (tx) => {
    const empleado = await tx.empleado.create({
      data: {
        empresa_id: input.empresaId,
        nombre: input.nombre,
        apellido: input.apellido,
        email,
        departamento: input.departamento || null,
        puesto: input.puesto || null,
      },
    })

    await tx.usuario.create({
      data: {
        email,
        password_hash: passwordHash,
        nombre: `${input.nombre} ${input.apellido}`.trim(),
        rol: "EMPLEADO",
        empresa_id: input.empresaId,
        activo: true,
      },
    })

    await tx.empresa.update({
      where: { id: input.empresaId },
      data: { asientos_usados: activeEmployees + 1 },
    })

    return empleado
  })

  const afterSeatSnapshot = await getCompanySeatSnapshot(input.empresaId)
  if (afterSeatSnapshot) {
    await createSeatHistoryEntry({
      actor: input.actor,
      empresaId: input.empresaId,
      motivo: "empleado_creado",
      detalle: `Alta de empleado ${input.nombre} ${input.apellido}.`,
      before: beforeSeatSnapshot,
      after: afterSeatSnapshot,
    })
  }

  await createAuditEvent({
    actor: input.actor,
    accion: "EMPLEADO_CREADO",
    entidadTipo: "EMPLEADO",
    entidadId: createdEmployee.id,
    empresaId: input.empresaId,
    resumen: `${input.actor.nombre} dio de alta al empleado ${input.nombre} ${input.apellido}.`,
      metadata: {
        email,
        departamento: input.departamento ?? null,
        puesto: input.puesto ?? null,
        tiene_paquete_activo: hasActivePackage,
      },
    })

  if (isWordPressBridgeConfigured()) {
    try {
      const bridgeEmployee = await bridgeUpsertEmployee({
        employeeId: createdEmployee.id,
        companyId: empresaContext.id,
        companyName: empresaContext.nombre,
        email,
        firstName: input.nombre,
        lastName: input.apellido,
        password: input.password,
        department: input.departamento ?? null,
        position: input.puesto ?? null,
      })

      await prisma.$transaction(async (tx) => {
        await tx.empleado.update({
          where: { id: createdEmployee.id },
          data: { wp_user_id: bridgeEmployee.wp_user_id },
        })

        await tx.usuario.updateMany({
          where: {
            email,
            empresa_id: input.empresaId,
          },
          data: { wp_user_id: bridgeEmployee.wp_user_id },
        })
      })

      return {
        ok: true as const,
        code: "empleado_creado_sync",
        employeeId: createdEmployee.id,
        hasActivePackage,
      }
    } catch (error) {
      return {
        ok: true as const,
        code: "empleado_creado_bridge_error",
        employeeId: createdEmployee.id,
        hasActivePackage,
      }
    }
  }

  return {
    ok: true as const,
    code: "empleado_creado",
    employeeId: createdEmployee.id,
    hasActivePackage,
  }
}

function normalizeCsvHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function csvField(
  row: Record<string, string>,
  aliases: string[]
) {
  for (const alias of aliases) {
    const value = row[alias]
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim()
    }
  }

  return ""
}

export async function createEmployeeAction(formData: FormData) {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)

  const empresaId = session.user.empresa_id as number
  const nombre = getString(formData, "nombre")
  const apellido = getString(formData, "apellido")
  const email = getString(formData, "email").toLowerCase()
  const departamento = getString(formData, "departamento")
  const puesto = getString(formData, "puesto")
  const password = getString(formData, "password")

  if (!nombre || !apellido || !email || !password) {
    redirect("/empresa/empleados?error=datos")
  }

  const result = await createEmployeeForEmpresa({
    empresaId,
    nombre,
    apellido,
    email,
    departamento: departamento || null,
    puesto: puesto || null,
    password,
    actor,
  })

  revalidatePath("/empresa/empleados")
  revalidatePath("/empresa/asignaciones")
  revalidatePath("/empleado/cursos")
  revalidatePath("/superadmin/reportes")
  revalidateTag(empresaCacheRootTag(empresaId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  if (!result.ok) {
    redirect(`/empresa/empleados?error=${result.code}`)
  }

  if (result.code === "empleado_creado_sync") {
    if (result.hasActivePackage) {
      redirect("/empresa/empleados?success=empleado_creado_sync&error=asignacion_manual")
    }
    redirect("/empresa/empleados?success=empleado_creado_sync")
  }

  if (result.code === "empleado_creado_bridge_error") {
    if (result.hasActivePackage) {
      redirect("/empresa/empleados?success=empleado_creado&error=asignacion_manual")
    }
    redirect("/empresa/empleados?success=empleado_creado&error=bridge_sync")
  }

  if (result.hasActivePackage) {
    redirect("/empresa/empleados?success=empleado_creado&error=asignacion_manual")
  }

  redirect("/empresa/empleados?success=empleado_creado")
}

export async function importEmployeesCsvAction(formData: FormData) {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)
  const empresaId = session.user.empresa_id as number
  const fallbackPassword = getString(formData, "password_csv")
  const file = formData.get("archivo_csv")

  if (!(file instanceof File) || file.size === 0) {
    redirect("/empresa/empleados?error=csv_file")
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    redirect("/empresa/empleados?error=csv_file")
  }

  const csvText = await file.text()
  const rows = parseCsvText(csvText)

  if (rows.length < 2) {
    redirect("/empresa/empleados?error=csv_empty")
  }

  if (rows.length - 1 > CSV_IMPORT_LIMIT) {
    redirect("/empresa/empleados?error=csv_limit")
  }

  const [headerRow, ...dataRows] = rows
  const headers = headerRow.map((header) => normalizeCsvHeader(header))

  const hasMissingPasswordWithoutFallback = dataRows.some((dataRow) => {
    const row = Object.fromEntries(
      headers.map((header, index) => [header, String(dataRow[index] ?? "").trim()])
    )

    const nombre = csvField(row, ["nombre", "first_name", "nombres"])
    const apellido = csvField(row, ["apellido", "apellidos", "last_name", "lastname"])
    const email = csvField(row, ["email", "correo", "correo_electronico"])
    const password = csvField(row, ["password", "contrasena", "contrasena_temporal"])

    if (!nombre || !apellido || !email) {
      return false
    }

    return !fallbackPassword && !password
  })

  if (hasMissingPasswordWithoutFallback) {
    redirect("/empresa/empleados?error=csv_password_required")
  }

  const empresaContext = await loadEmpresaProvisioningContext(empresaId)
  if (!empresaContext) {
    redirect("/empresa/empleados?error=empresa")
  }

  let created = 0
  let synced = 0
  let bridgeWarnings = 0
  let skipped = 0

  for (const dataRow of dataRows) {
    const row = Object.fromEntries(
      headers.map((header, index) => [header, String(dataRow[index] ?? "").trim()])
    )

    const nombre = csvField(row, ["nombre", "first_name", "nombres"])
    const apellido = csvField(row, ["apellido", "apellidos", "last_name", "lastname"])
    const email = csvField(row, ["email", "correo", "correo_electronico"])
      .toLowerCase()
    const departamento = csvField(row, ["departamento", "department"]) || null
    const puesto = csvField(row, ["puesto", "position", "cargo"]) || null
    const password =
      csvField(row, ["password", "contrasena", "contrasena_temporal"]) ||
      fallbackPassword

    if (!nombre || !apellido || !email) {
      skipped += 1
      continue
    }

    if (!password) {
      skipped += 1
      continue
    }

    const result = await createEmployeeForEmpresa({
      empresaId,
      nombre,
      apellido,
      email,
      departamento,
      puesto,
      password,
      empresaContext,
      actor,
    })

    if (!result.ok) {
      skipped += 1
      if (result.code === "cupos") {
        break
      }
      continue
    }

    created += 1
    if (result.code === "empleado_creado_sync") {
      synced += 1
    }
    if (result.code === "empleado_creado_bridge_error") {
      bridgeWarnings += 1
    }
  }

  await createAuditEvent({
    actor,
    accion: "EMPLEADOS_IMPORTADOS_CSV",
    entidadTipo: "EMPRESA",
    entidadId: empresaId,
    empresaId,
    resumen: `${actor.nombre} ejecuto importacion masiva CSV de empleados.`,
    metadata: {
      creados: created,
      sincronizados: synced,
      advertencias_bridge: bridgeWarnings,
      omitidos: skipped,
    },
  })

  revalidatePath("/empresa/empleados")
  revalidatePath("/empresa/inicio")
  revalidatePath("/empresa/progreso")
  revalidatePath("/empresa/constancias")
  revalidatePath("/superadmin/reportes")
  revalidateTag(empresaCacheRootTag(empresaId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  redirect(
    `/empresa/empleados?success=csv_imported&created=${created}&synced=${synced}&warnings=${bridgeWarnings}&skipped=${skipped}`
  )
}

export async function toggleEmployeeStatusAction(formData: FormData) {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)

  const empresaId = session.user.empresa_id as number
  const empleadoId = Number.parseInt(String(formData.get("empleado_id") ?? "0"), 10)
  const returnTo = sanitizeReturnTo(getString(formData, "return_to"))

  if (!empleadoId) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  const [empleado, beforeSeatSnapshot] = await Promise.all([
    prisma.empleado.findFirst({
      where: {
        id: empleadoId,
        empresa_id: empresaId,
      },
      select: {
        id: true,
        activo: true,
        email: true,
        nombre: true,
        apellido: true,
      },
    }),
    getCompanySeatSnapshot(empresaId),
  ])

  if (!empleado || !beforeSeatSnapshot) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  await prisma.$transaction(async (tx) => {
    await tx.empleado.update({
      where: { id: empleado.id },
      data: { activo: !empleado.activo },
    })

    await tx.usuario.updateMany({
      where: {
        email: empleado.email,
        empresa_id: empresaId,
      },
      data: { activo: !empleado.activo },
    })
    
    const activeEmployees = await tx.empleado.count({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
    })

    await tx.empresa.update({
      where: { id: empresaId },
      data: { asientos_usados: activeEmployees },
    })
  })

  const afterSeatSnapshot = await getCompanySeatSnapshot(empresaId)
  if (afterSeatSnapshot) {
    await createSeatHistoryEntry({
      actor,
      empresaId,
      motivo: empleado.activo ? "empleado_suspendido" : "empleado_reactivado",
      detalle: `${empleado.nombre} ${empleado.apellido} (${empleado.email})`,
      before: beforeSeatSnapshot,
      after: afterSeatSnapshot,
    })
  }

  await createAuditEvent({
    actor,
    accion: empleado.activo ? "EMPLEADO_SUSPENDIDO" : "EMPLEADO_REACTIVADO",
    entidadTipo: "EMPLEADO",
    entidadId: empleado.id,
    empresaId,
    resumen: `${actor.nombre} ${empleado.activo ? "suspendio" : "reactivo"} al empleado ${empleado.nombre} ${empleado.apellido}.`,
    metadata: {
      email: empleado.email,
    },
  })

  revalidatePath("/empresa/empleados")
  revalidatePath("/superadmin/reportes")
  revalidateTag(empresaCacheRootTag(empresaId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect(withStatus(returnTo, "success", empleado.activo ? "empleado_suspendido" : "empleado_activado"))
}

export async function deleteEmployeeAction(formData: FormData) {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)

  const empresaId = session.user.empresa_id as number
  const empleadoId = Number.parseInt(String(formData.get("empleado_id") ?? "0"), 10)
  const returnTo = sanitizeReturnTo(getString(formData, "return_to"))

  if (!empleadoId) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  try {
    await deleteEmployeeRecord({
      empleadoId,
      empresaId,
      actor,
      source: "RH",
    })
  } catch (error) {
    const errorCode =
      error instanceof Error && error.message === "Empleado no encontrado"
        ? "empleado"
        : "bridge_delete"

    redirect(withStatus(returnTo, "error", errorCode))
  }

  revalidatePath("/empresa/empleados")
  revalidatePath("/empresa/inicio")
  revalidatePath("/empresa/progreso")
  revalidatePath("/superadmin/accesos")
  revalidatePath("/superadmin/reportes")
  revalidateTag(empresaCacheRootTag(empresaId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect(withStatus(returnTo, "success", "empleado_eliminado"))
}

export async function triggerCompanyLearningSyncAction() {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)
  const empresaId = session.user.empresa_id as number

  const queued = scheduleCompanyEmployeeLearningBatch(empresaId, {
    limit: 100,
    staleOnly: false,
  })

  await createAuditEvent({
    actor,
    accion: queued ? "SYNC_EMPRESA_EN_COLA" : "SYNC_EMPRESA_YA_EN_COLA",
    entidadTipo: "EMPRESA",
    entidadId: empresaId,
    empresaId,
    resumen: `${actor.nombre} solicito sincronizacion de aprendizaje para su empresa.`,
  })

  revalidatePath("/empresa/empleados")
  revalidatePath("/empresa/inicio")
  revalidatePath("/empresa/progreso")
  revalidatePath("/empleado/cursos")
  revalidatePath("/empleado/progreso")
  revalidatePath("/empleado/constancias")
  revalidatePath("/superadmin/reportes")
  revalidateTag(empresaCacheRootTag(empresaId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  redirect(`/empresa/empleados?success=${queued ? "sync_background_started" : "sync_background_already_running"}`)
}
