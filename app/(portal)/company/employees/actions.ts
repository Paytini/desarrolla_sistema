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
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
import { parseCsvText } from "@/lib/csv"
import { scheduleCompanyEmployeeLearningBatch } from "@/lib/employee-learning"
import { prisma } from "@/lib/prisma"
import {
  bridgeUpsertEmployee,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"

const CSV_IMPORT_LIMIT = 200
const CSV_HASH_CONCURRENCY = 8
const CSV_BRIDGE_CONCURRENCY = 5

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function sanitizeReturnTo(path: string | null | undefined) {
  const value = (path ?? "").trim()
  if (!value.startsWith("/company/employees")) {
    return "/company/employees"
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

type CompanyProvisioningContext = {
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
  companyId: number
  nombre: string
  apellido: string
  apellidoMaterno?: string | null
  email: string
  curp?: string | null
  departamento?: string | null
  puesto?: string | null
  ocupacionEspecificaClave?: string | null
  ocupacionEspecifica?: string | null
  password: string
  companyContext?: CompanyProvisioningContext
  actor: AuditActor
}

async function loadCompanyProvisioningContext(companyId: number) {
  return prisma.empresa.findUnique({
    where: { id: companyId },
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

async function createEmployeeForCompany(input: EmployeeProvisioningInput) {
  const companyContext =
    input.companyContext ?? (await loadCompanyProvisioningContext(input.companyId))

  if (!companyContext) {
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

  const beforeSeatSnapshot = await getCompanySeatSnapshot(input.companyId)

  if (!beforeSeatSnapshot) {
    return {
      ok: false as const,
      code: "empresa",
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 12)
  const activePackage = companyContext.paquetes[0]
  const hasActivePackage = Boolean(activePackage)

  let createdEmployee: Awaited<ReturnType<typeof prisma.empleado.create>>
  try {
    createdEmployee = await prisma.$transaction(async (tx) => {
      const activeEmployees = await tx.empleado.count({
        where: { empresa_id: input.companyId, activo: true },
      })

      if (activeEmployees >= companyContext.asientos_contratados) {
        throw Object.assign(new Error("cupos"), { code: "cupos" })
      }

      const employee = await tx.empleado.create({
        data: {
          empresa_id: input.companyId,
          nombre: input.nombre,
          apellido: input.apellido,
          apellido_materno: input.apellidoMaterno || null,
          email,
          curp: input.curp || null,
          departamento: input.departamento || null,
          puesto: input.puesto || null,
          ocupacion_especifica_clave: input.ocupacionEspecificaClave || null,
          ocupacion_especifica: input.ocupacionEspecifica || null,
        },
      })

      await tx.usuario.create({
        data: {
          email,
          password_hash: passwordHash,
          nombre: `${input.nombre} ${input.apellido}`.trim(),
          rol: "EMPLEADO",
          empresa_id: input.companyId,
          activo: true,
        },
      })

      await tx.empresa.update({
        where: { id: input.companyId },
        data: { asientos_usados: activeEmployees + 1 },
      })

      return employee
    })
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === "cupos") {
      return { ok: false as const, code: "cupos" }
    }
    throw err
  }

  const afterSeatSnapshot = await getCompanySeatSnapshot(input.companyId)
  if (afterSeatSnapshot) {
    await createSeatHistoryEntry({
      actor: input.actor,
      empresaId: input.companyId,
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
    empresaId: input.companyId,
    resumen: `${input.actor.nombre} dio de alta al empleado ${input.nombre} ${input.apellido}.`,
    metadata: {
      email,
      departamento: input.departamento ?? null,
      puesto: input.puesto ?? null,
      curp: input.curp ?? null,
      ocupacion_especifica_clave: input.ocupacionEspecificaClave ?? null,
      ocupacion_especifica: input.ocupacionEspecifica ?? null,
      tiene_paquete_activo: hasActivePackage,
    },
  })

  if (isWordPressBridgeConfigured()) {
    try {
      const bridgeEmployee = await bridgeUpsertEmployee({
        employeeId: createdEmployee.id,
        companyId: companyContext.id,
        companyName: companyContext.nombre,
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
            empresa_id: input.companyId,
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
    } catch {
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

type NormalizedCsvEmployeeRow = {
  nombre: string
  apellido: string
  apellidoMaterno: string | null
  email: string
  curp: string | null
  departamento: string | null
  puesto: string | null
  ocupacionEspecificaClave: string | null
  ocupacionEspecifica: string | null
  password: string
}

type CreatedCsvEmployee = NormalizedCsvEmployeeRow & {
  id: number
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(concurrency, 1), items.length) },
    () => worker()
  )

  await Promise.all(workers)
  return results
}

function normalizeCsvEmployees(
  dataRows: string[][],
  headers: string[],
  fallbackPassword: string
) {
  const employees: NormalizedCsvEmployeeRow[] = []
  const seenEmails = new Set<string>()
  let skipped = 0
  let missingPassword = false

  for (const dataRow of dataRows) {
    const row = Object.fromEntries(
      headers.map((header, index) => [header, String(dataRow[index] ?? "").trim()])
    )

    const nombre = csvField(row, ["nombre", "first_name", "nombres"])
    const apellido = csvField(row, ["apellido", "apellido_paterno", "last_name", "lastname"])
    const apellidoMaterno = csvField(row, ["apellido_materno", "segundo_apellido"]) || null
    const email = csvField(row, ["email", "correo", "correo_electronico"]).toLowerCase()
    const curp = csvField(row, ["curp"]) || null
    const departamento = csvField(row, ["departamento", "department"]) || null
    const puesto = csvField(row, ["puesto", "position", "cargo"]) || null
    const ocupacionEspecificaClave =
      csvField(row, [
        "ocupacion_especifica_clave",
        "clave_ocupacion",
        "clave_ocupacion_especifica",
      ]) || null
    const ocupacionEspecifica =
      csvField(row, ["ocupacion_especifica", "ocupacion", "ocupacion_cno"]) || null
    const password =
      csvField(row, ["password", "contrasena", "contrasena_temporal"]) ||
      fallbackPassword

    if (!nombre || !apellido || !email) {
      skipped += 1
      continue
    }

    if (!password) {
      missingPassword = true
      continue
    }

    if (seenEmails.has(email)) {
      skipped += 1
      continue
    }

    seenEmails.add(email)
    employees.push({
      nombre,
      apellido,
      apellidoMaterno,
      email,
      curp,
      departamento,
      puesto,
      ocupacionEspecificaClave,
      ocupacionEspecifica,
      password,
    })
  }

  return {
    employees,
    skipped,
    missingPassword,
  }
}

async function syncCsvEmployeesToWordPress(input: {
  companyContext: CompanyProvisioningContext
  employees: CreatedCsvEmployee[]
}) {
  if (!isWordPressBridgeConfigured() || input.employees.length === 0) {
    return {
      synced: 0,
      bridgeWarnings: 0,
    }
  }

  const results = await mapWithConcurrency(
    input.employees,
    CSV_BRIDGE_CONCURRENCY,
    async (employee) => {
      try {
        const bridgeEmployee = await bridgeUpsertEmployee({
          employeeId: employee.id,
          companyId: input.companyContext.id,
          companyName: input.companyContext.nombre,
          email: employee.email,
          firstName: employee.nombre,
          lastName: employee.apellido,
          password: employee.password,
          department: employee.departamento,
          position: employee.puesto,
        })

        return {
          status: "synced" as const,
          employeeId: employee.id,
          email: employee.email,
          wpUserId: bridgeEmployee.wp_user_id,
        }
      } catch {
        return {
          status: "warning" as const,
          employeeId: employee.id,
          email: employee.email,
          wpUserId: null,
        }
      }
    }
  )

  const syncedResults = results.filter((result) => result.status === "synced")

  if (syncedResults.length > 0) {
    await prisma.$transaction(
      syncedResults.flatMap((result) => [
        prisma.empleado.update({
          where: { id: result.employeeId },
          data: { wp_user_id: result.wpUserId },
        }),
        prisma.usuario.updateMany({
          where: {
            email: result.email,
            empresa_id: input.companyContext.id,
          },
          data: { wp_user_id: result.wpUserId },
        }),
      ])
    )
  }

  return {
    synced: syncedResults.length,
    bridgeWarnings: results.length - syncedResults.length,
  }
}

export async function createEmployeeAction(formData: FormData) {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)

  const companyId = session.user.empresa_id as number
  const nombre = getString(formData, "nombre")
  const apellido = getString(formData, "apellido")
  const apellidoMaterno = getString(formData, "apellido_materno")
  const email = getString(formData, "email").toLowerCase()
  const curp = getString(formData, "curp").toUpperCase()
  const departamento = getString(formData, "departamento")
  const puesto = getString(formData, "puesto")
  const ocupacionEspecificaClave = getString(formData, "ocupacion_especifica_clave")
  const ocupacionEspecifica = getString(formData, "ocupacion_especifica")
  const password = getString(formData, "password")

  if (!nombre || !apellido || !email || !password) {
    redirect("/company/employees?error=datos")
  }

  const result = await createEmployeeForCompany({
    companyId,
    nombre,
    apellido,
    apellidoMaterno: apellidoMaterno || null,
    email,
    curp: curp || null,
    departamento: departamento || null,
    puesto: puesto || null,
    ocupacionEspecificaClave: ocupacionEspecificaClave || null,
    ocupacionEspecifica: ocupacionEspecifica || null,
    password,
    actor,
  })

  revalidatePath("/company/employees")
  revalidatePath("/company/assignments")
  revalidatePath("/employee/courses")
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  if (!result.ok) {
    redirect(`/company/employees?error=${result.code}`)
  }

  if (result.code === "empleado_creado_sync") {
    if (result.hasActivePackage) {
      redirect("/company/employees?success=empleado_creado_sync&error=asignacion_manual")
    }
    redirect("/company/employees?success=empleado_creado_sync")
  }

  if (result.code === "empleado_creado_bridge_error") {
    if (result.hasActivePackage) {
      redirect("/company/employees?success=empleado_creado&error=asignacion_manual")
    }
    redirect("/company/employees?success=empleado_creado&error=bridge_sync")
  }

  if (result.hasActivePackage) {
    redirect("/company/employees?success=empleado_creado&error=asignacion_manual")
  }

  redirect("/company/employees?success=empleado_creado")
}

export async function importEmployeesCsvAction(formData: FormData) {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)
  const companyId = session.user.empresa_id as number
  const fallbackPassword = getString(formData, "password_csv")
  const file = formData.get("archivo_csv")

  if (!(file instanceof File) || file.size === 0) {
    redirect("/company/employees?error=csv_file")
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    redirect("/company/employees?error=csv_file")
  }

  const csvText = await file.text()
  const rows = parseCsvText(csvText)

  if (rows.length < 2) {
    redirect("/company/employees?error=csv_empty")
  }

  if (rows.length - 1 > CSV_IMPORT_LIMIT) {
    redirect("/company/employees?error=csv_limit")
  }

  const [headerRow, ...dataRows] = rows
  const headers = headerRow.map((header) => normalizeCsvHeader(header))
  const normalizedCsv = normalizeCsvEmployees(dataRows, headers, fallbackPassword)

  if (normalizedCsv.missingPassword) {
    redirect("/company/employees?error=csv_password_required")
  }

  if (normalizedCsv.employees.length === 0) {
    redirect("/company/employees?error=csv_empty")
  }

  const companyContext = await loadCompanyProvisioningContext(companyId)
  if (!companyContext) {
    redirect("/company/employees?error=empresa")
  }

  const candidateEmails = normalizedCsv.employees.map((employee) => employee.email)
  const [beforeSeatSnapshot, activeEmployees, existingEmployees, existingUsers] = await Promise.all([
    getCompanySeatSnapshot(companyId),
    prisma.empleado.count({
      where: {
        empresa_id: companyId,
        activo: true,
      },
    }),
    candidateEmails.length > 0
      ? prisma.empleado.findMany({
          where: { email: { in: candidateEmails } },
          select: { email: true },
        })
      : Promise.resolve([]),
    candidateEmails.length > 0
      ? prisma.usuario.findMany({
          where: { email: { in: candidateEmails } },
          select: { email: true },
        })
      : Promise.resolve([]),
  ])

  if (!beforeSeatSnapshot) {
    redirect("/company/employees?error=empresa")
  }

  const existingEmails = new Set([
    ...existingEmployees.map((employee) => employee.email.toLowerCase()),
    ...existingUsers.map((user) => user.email.toLowerCase()),
  ])

  const availableEmployees = normalizedCsv.employees.filter((employee) => {
    return !existingEmails.has(employee.email)
  })
  let skipped = normalizedCsv.skipped + (normalizedCsv.employees.length - availableEmployees.length)
  const availableSeats = Math.max(companyContext.asientos_contratados - activeEmployees, 0)

  if (availableSeats <= 0) {
    redirect("/company/employees?error=cupos")
  }

  const employeesToCreate = availableEmployees.slice(0, availableSeats)
  skipped += Math.max(availableEmployees.length - employeesToCreate.length, 0)

  const passwordHashes = await mapWithConcurrency(
    employeesToCreate,
    CSV_HASH_CONCURRENCY,
    (employee) => bcrypt.hash(employee.password, 12)
  )

  const createdEmployees = employeesToCreate.length > 0
    ? await prisma.$transaction(async (tx) => {
        await tx.empleado.createMany({
          data: employeesToCreate.map((employee) => ({
            empresa_id: companyId,
            nombre: employee.nombre,
            apellido: employee.apellido,
            apellido_materno: employee.apellidoMaterno,
            email: employee.email,
            curp: employee.curp,
            departamento: employee.departamento,
            puesto: employee.puesto,
            ocupacion_especifica_clave: employee.ocupacionEspecificaClave,
            ocupacion_especifica: employee.ocupacionEspecifica,
          })),
        })

        await tx.usuario.createMany({
          data: employeesToCreate.map((employee, index) => ({
            email: employee.email,
            password_hash: passwordHashes[index],
            nombre: `${employee.nombre} ${employee.apellido}`.trim(),
            rol: "EMPLEADO",
            empresa_id: companyId,
            activo: true,
          })),
        })

        await tx.empresa.update({
          where: { id: companyId },
          data: { asientos_usados: activeEmployees + employeesToCreate.length },
        })

        const persistedEmployees = await tx.empleado.findMany({
          where: {
            empresa_id: companyId,
            email: { in: employeesToCreate.map((employee) => employee.email) },
          },
          select: {
            id: true,
            email: true,
          },
        })

        const persistedByEmail = new Map(
          persistedEmployees.map((employee) => [employee.email.toLowerCase(), employee])
        )

        return employeesToCreate.flatMap((employee) => {
          const persistedEmployee = persistedByEmail.get(employee.email)
          return persistedEmployee
            ? [
                {
                  ...employee,
                  id: persistedEmployee.id,
                },
              ]
            : []
        })
      }, {
        timeout: 15_000,
      })
    : []

  const bridgeResult = await syncCsvEmployeesToWordPress({
    companyContext,
    employees: createdEmployees,
  })
  const created = createdEmployees.length
  const synced = bridgeResult.synced
  const bridgeWarnings = bridgeResult.bridgeWarnings

  const afterSeatSnapshot = await getCompanySeatSnapshot(companyId)
  if (afterSeatSnapshot && created > 0) {
    await createSeatHistoryEntry({
      actor,
      empresaId: companyId,
      motivo: "empleados_importados_csv",
      detalle: `Importacion CSV de ${created} empleado(s).`,
      before: beforeSeatSnapshot,
      after: afterSeatSnapshot,
    })
  }

  await createAuditEvent({
    actor,
    accion: "EMPLEADOS_IMPORTADOS_CSV",
    entidadTipo: "EMPRESA",
    entidadId: companyId,
    empresaId: companyId,
    resumen: `${actor.nombre} ejecuto importacion masiva CSV de empleados.`,
    metadata: {
      creados: created,
      sincronizados: synced,
      advertencias_bridge: bridgeWarnings,
      omitidos: skipped,
    },
  })

  revalidatePath("/company/employees")
  revalidatePath("/company/home")
  revalidatePath("/company/progress")
  revalidatePath("/company/certificates")
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  redirect(
    `/company/employees?success=csv_imported&created=${created}&synced=${synced}&warnings=${bridgeWarnings}&skipped=${skipped}`
  )
}
export async function toggleEmployeeStatusAction(formData: FormData) {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)

  const companyId = session.user.empresa_id as number
  const employeeId = Number.parseInt(String(formData.get("empleado_id") ?? "0"), 10)
  const returnTo = sanitizeReturnTo(getString(formData, "return_to"))

  if (!employeeId) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  const [employee, beforeSeatSnapshot] = await Promise.all([
    prisma.empleado.findFirst({
      where: {
        id: employeeId,
        empresa_id: companyId,
      },
      select: {
        id: true,
        activo: true,
        email: true,
        nombre: true,
        apellido: true,
      },
    }),
    getCompanySeatSnapshot(companyId),
  ])

  if (!employee || !beforeSeatSnapshot) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  await prisma.$transaction(async (tx) => {
    await tx.empleado.update({
      where: { id: employee.id },
      data: { activo: !employee.activo },
    })

    await tx.usuario.updateMany({
      where: {
        email: employee.email,
        empresa_id: companyId,
      },
      data: { activo: !employee.activo },
    })

    const activeEmployees = await tx.empleado.count({
      where: {
        empresa_id: companyId,
        activo: true,
      },
    })

    await tx.empresa.update({
      where: { id: companyId },
      data: { asientos_usados: activeEmployees },
    })
  })

  const afterSeatSnapshot = await getCompanySeatSnapshot(companyId)
  if (afterSeatSnapshot) {
    await createSeatHistoryEntry({
      actor,
      empresaId: companyId,
      motivo: employee.activo ? "empleado_suspendido" : "empleado_reactivado",
      detalle: `${employee.nombre} ${employee.apellido} (${employee.email})`,
      before: beforeSeatSnapshot,
      after: afterSeatSnapshot,
    })
  }

  await createAuditEvent({
    actor,
    accion: employee.activo ? "EMPLEADO_SUSPENDIDO" : "EMPLEADO_REACTIVADO",
    entidadTipo: "EMPLEADO",
    entidadId: employee.id,
    empresaId: companyId,
    resumen: `${actor.nombre} ${employee.activo ? "suspendio" : "reactivo"} al empleado ${employee.nombre} ${employee.apellido}.`,
    metadata: {
      email: employee.email,
    },
  })

  revalidatePath("/company/employees")
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect(withStatus(returnTo, "success", employee.activo ? "empleado_suspendido" : "empleado_activado"))
}

export async function deleteEmployeeAction(formData: FormData) {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)

  const companyId = session.user.empresa_id as number
  const employeeId = Number.parseInt(String(formData.get("empleado_id") ?? "0"), 10)
  const returnTo = sanitizeReturnTo(getString(formData, "return_to"))

  if (!employeeId) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  try {
    await deleteEmployeeRecord({
      employeeId,
      companyId,
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

  revalidatePath("/company/employees")
  revalidatePath("/company/home")
  revalidatePath("/company/progress")
  revalidatePath("/superadmin/access")
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect(withStatus(returnTo, "success", "empleado_eliminado"))
}

export async function triggerCompanyLearningSyncAction() {
  const session = await requireRhSession()
  const actor = getAuditActorFromSession(session)
  const companyId = session.user.empresa_id as number

  const queued = scheduleCompanyEmployeeLearningBatch(companyId, {
    limit: 100,
    staleOnly: false,
  })

  await createAuditEvent({
    actor,
    accion: queued ? "SYNC_EMPRESA_EN_COLA" : "SYNC_EMPRESA_YA_EN_COLA",
    entidadTipo: "EMPRESA",
    entidadId: companyId,
    empresaId: companyId,
    resumen: `${actor.nombre} solicito sincronizacion de aprendizaje para su empresa.`,
  })

  revalidatePath("/company/employees")
  revalidatePath("/company/home")
  revalidatePath("/company/progress")
  revalidatePath("/employee/courses")
  revalidatePath("/employee/certificates")
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  redirect(`/company/employees?success=${queued ? "sync_background_started" : "sync_background_already_running"}`)
}
