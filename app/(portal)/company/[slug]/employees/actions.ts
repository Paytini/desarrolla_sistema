"use server"

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
import { requireHrSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
import { requireCompanySlug } from "@/lib/company-branding"
import { companyPath } from "@/lib/company-routes"
import { withoutCompanyContext } from "@/lib/tenant-context"
import { parseCsvText } from "@/lib/csv"
import { buildActivationEmail } from "@/lib/email-templates/activation"
import { scheduleCompanyEmployeeLearningBatch } from "@/lib/employee-learning"
import {
  enqueueCsvEmployeeBridgeSyncJob,
  enqueueEmailSendJob,
  enqueueEmailSendJobs,
} from "@/lib/jobs"
import { buildActivationUrl, buildPendingActivationFields, hashPassword } from "@/lib/onboarding"
import { prisma } from "@/lib/prisma"
import { isUuid } from "@/lib/uuid"
import { bridgeUpsertEmployee, isWordPressBridgeConfigured } from "@/lib/wordpress-bridge"

const CSV_IMPORT_LIMIT = 200

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function employeesPath(slug: string, query?: string) {
  return companyPath(slug, `/employees${query ?? ""}`)
}

function sanitizeReturnTo(path: string | null | undefined, slug: string) {
  const value = (path ?? "").trim()
  if (!value.startsWith(employeesPath(slug))) {
    return employeesPath(slug)
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
  id: string
  name: string
  contracted_seats: number
  packages: Array<{
    package: {
      delivery_mode: string
      courses: Array<{
        wp_course_id: number
        course_name: string
      }>
    }
  }>
}

type EmployeeProvisioningInput = {
  companyId: string
  nombre: string
  apellido: string
  apellidoMaterno?: string | null
  email: string
  curp?: string | null
  departamento?: string | null
  puesto?: string | null
  ocupacionEspecificaClave?: string | null
  ocupacionEspecifica?: string | null
  password?: string
  companyContext?: CompanyProvisioningContext
  actor: AuditActor
}

async function loadCompanyProvisioningContext(companyId: string) {
  return prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      contracted_seats: true,
      packages: {
        where: { active: true },
        orderBy: { created_at: "desc" },
        include: {
          package: {
            select: {
              delivery_mode: true,
              courses: {
                select: {
                  wp_course_id: true,
                  course_name: true,
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

  // email is globally unique across companies, so this check must look
  // outside the current tenant scope, not just within it.
  const [existingEmployee, existingUser] = await withoutCompanyContext(() =>
    Promise.all([
      prisma.employee.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
    ]),
  )

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

  const pendingActivation = input.password ? null : buildPendingActivationFields()
  const passwordHash = input.password
    ? await hashPassword(input.password)
    : pendingActivation!.passwordHash
  const activePackage = companyContext.packages[0]
  const hasActivePackage = Boolean(activePackage)

  let createdEmployee: Awaited<ReturnType<typeof prisma.employee.create>>
  try {
    createdEmployee = await prisma.$transaction(async (tx) => {
      const activeEmployees = await tx.employee.count({
        where: { company_id: input.companyId, active: true },
      })

      if (activeEmployees >= companyContext.contracted_seats) {
        throw Object.assign(new Error("cupos"), { code: "cupos" })
      }

      const employee = await tx.employee.create({
        data: {
          company_id: input.companyId,
          first_name: input.nombre,
          last_name: input.apellido,
          second_last_name: input.apellidoMaterno || null,
          email,
          curp: input.curp || null,
          department: input.departamento || null,
          position: input.puesto || null,
          occupation_code: input.ocupacionEspecificaClave || null,
          occupation_name: input.ocupacionEspecifica || null,
        },
      })

      await tx.user.create({
        data: {
          email,
          password_hash: passwordHash,
          activation_token: pendingActivation?.activationToken ?? null,
          activation_token_expires_at: pendingActivation?.activationTokenExpiresAt ?? null,
          must_change_password: Boolean(input.password),
          name: `${input.nombre} ${input.apellido}`.trim(),
          role: "EMPLOYEE",
          company_id: input.companyId,
          active: true,
        },
      })

      await tx.company.update({
        where: { id: input.companyId },
        data: { used_seats: activeEmployees + 1 },
      })

      return employee
    })
  } catch (err) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException & { code?: string }).code === "cupos"
    ) {
      return { ok: false as const, code: "cupos" }
    }
    throw err
  }

  let activationEmailQueued = false
  if (pendingActivation) {
    try {
      const { subject, html, text } = buildActivationEmail({
        nombreEmpleado: input.nombre,
        nombreEmpresa: companyContext.name,
        activationUrl: buildActivationUrl(pendingActivation.activationToken),
      })
      await enqueueEmailSendJob({ to: email, subject, html, text })
      activationEmailQueued = true
    } catch (error) {
      console.error("No se pudo encolar el correo de activación", {
        employeeId: createdEmployee.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const afterSeatSnapshot = await getCompanySeatSnapshot(input.companyId)
  if (afterSeatSnapshot) {
    await createSeatHistoryEntry({
      actor: input.actor,
      companyId: input.companyId,
      motivo: "empleado_creado",
      detalle: `Alta de empleado ${input.nombre} ${input.apellido}.`,
      before: beforeSeatSnapshot,
      after: afterSeatSnapshot,
    })
  }

  await createAuditEvent({
    actor: input.actor,
    accion: "EMPLEADO_CREADO",
    entityType: "EMPLEADO",
    entityId: createdEmployee.id,
    companyId: input.companyId,
    resumen: `${input.actor.nombre} dio de alta al empleado ${input.nombre} ${input.apellido}.`,
    metadata: {
      email,
      departamento: input.departamento ?? null,
      puesto: input.puesto ?? null,
      curp: input.curp ?? null,
      ocupacion_especifica_clave: input.ocupacionEspecificaClave ?? null,
      ocupacion_especifica: input.ocupacionEspecifica ?? null,
      tiene_paquete_activo: hasActivePackage,
      correo_activacion_encolado: activationEmailQueued,
    },
  })

  if (isWordPressBridgeConfigured()) {
    try {
      const bridgeEmployee = await bridgeUpsertEmployee({
        employeeId: createdEmployee.id,
        companyId: companyContext.id,
        companyName: companyContext.name,
        email,
        firstName: input.nombre,
        lastName: input.apellido,
        password: input.password,
        department: input.departamento ?? null,
        position: input.puesto ?? null,
      })

      await prisma.$transaction(async (tx) => {
        await tx.employee.update({
          where: { id: createdEmployee.id },
          data: { wp_user_id: bridgeEmployee.wp_user_id },
        })

        await tx.user.updateMany({
          where: {
            email,
            company_id: input.companyId,
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

function csvField(row: Record<string, string>, aliases: string[]) {
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
}

function normalizeCsvEmployees(dataRows: string[][], headers: string[]) {
  const employees: NormalizedCsvEmployeeRow[] = []
  const seenEmails = new Set<string>()
  let skipped = 0

  for (const dataRow of dataRows) {
    const row = Object.fromEntries(
      headers.map((header, index) => [header, String(dataRow[index] ?? "").trim()]),
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

    if (!nombre || !apellido || !email) {
      skipped += 1
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
    })
  }

  return {
    employees,
    skipped,
  }
}

export async function createEmployeeAction(formData: FormData) {
  const session = await requireHrSession()
  const actor = getAuditActorFromSession(session)

  const companyId = session.user.empresa_id as string
  const slug = await requireCompanySlug(companyId)
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

  if (
    !nombre ||
    !apellido ||
    !apellidoMaterno ||
    !email ||
    !curp ||
    !departamento ||
    !puesto ||
    !ocupacionEspecificaClave ||
    !ocupacionEspecifica ||
    password.length < 8
  ) {
    redirect(employeesPath(slug, "?error=datos"))
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

  revalidatePath(employeesPath(slug))
  revalidatePath(companyPath(slug, "/assignments"))
  revalidatePath("/employee/courses")
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  if (!result.ok) {
    redirect(employeesPath(slug, `?error=${result.code}`))
  }

  if (result.code === "empleado_creado_sync") {
    if (result.hasActivePackage) {
      redirect(employeesPath(slug, "?success=empleado_creado_sync&error=asignacion_manual"))
    }
    redirect(employeesPath(slug, "?success=empleado_creado_sync"))
  }

  if (result.code === "empleado_creado_bridge_error") {
    if (result.hasActivePackage) {
      redirect(employeesPath(slug, "?success=empleado_creado&error=asignacion_manual"))
    }
    redirect(employeesPath(slug, "?success=empleado_creado&error=bridge_sync"))
  }

  if (result.hasActivePackage) {
    redirect(employeesPath(slug, "?success=empleado_creado&error=asignacion_manual"))
  }

  redirect(employeesPath(slug, "?success=empleado_creado"))
}

export async function importEmployeesCsvAction(formData: FormData) {
  const session = await requireHrSession()
  const actor = getAuditActorFromSession(session)
  const companyId = session.user.empresa_id as string
  const slug = await requireCompanySlug(companyId)
  const file = formData.get("archivo_csv")

  if (!(file instanceof File) || file.size === 0) {
    redirect(employeesPath(slug, "?error=csv_file"))
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    redirect(employeesPath(slug, "?error=csv_file"))
  }

  const csvText = await file.text()
  const rows = parseCsvText(csvText)

  if (rows.length < 2) {
    redirect(employeesPath(slug, "?error=csv_empty"))
  }

  if (rows.length - 1 > CSV_IMPORT_LIMIT) {
    redirect(employeesPath(slug, "?error=csv_limit"))
  }

  const [headerRow, ...dataRows] = rows
  const headers = headerRow.map((header) => normalizeCsvHeader(header))
  const normalizedCsv = normalizeCsvEmployees(dataRows, headers)

  if (normalizedCsv.employees.length === 0) {
    redirect(employeesPath(slug, "?error=csv_empty"))
  }

  const companyContext = await loadCompanyProvisioningContext(companyId)
  if (!companyContext) {
    redirect(employeesPath(slug, "?error=empresa"))
  }

  const candidateEmails = normalizedCsv.employees.map((employee) => employee.email)
  // email is globally unique across companies, so these existence checks must
  // look outside the current tenant scope, not just within it.
  const [existingEmployees, existingUsers] = await withoutCompanyContext(() =>
    Promise.all([
      candidateEmails.length > 0
        ? prisma.employee.findMany({
            where: { email: { in: candidateEmails } },
            select: { email: true },
          })
        : Promise.resolve([]),
      candidateEmails.length > 0
        ? prisma.user.findMany({
            where: { email: { in: candidateEmails } },
            select: { email: true },
          })
        : Promise.resolve([]),
    ]),
  )
  const [beforeSeatSnapshot, activeEmployees] = await Promise.all([
    getCompanySeatSnapshot(companyId),
    prisma.employee.count({
      where: {
        company_id: companyId,
        active: true,
      },
    }),
  ])

  if (!beforeSeatSnapshot) {
    redirect(employeesPath(slug, "?error=empresa"))
  }

  const existingEmails = new Set([
    ...existingEmployees.map((employee) => employee.email.toLowerCase()),
    ...existingUsers.map((user) => user.email.toLowerCase()),
  ])

  const availableEmployees = normalizedCsv.employees.filter((employee) => {
    return !existingEmails.has(employee.email)
  })
  let skipped = normalizedCsv.skipped + (normalizedCsv.employees.length - availableEmployees.length)
  const availableSeats = Math.max(companyContext.contracted_seats - activeEmployees, 0)

  if (availableSeats <= 0) {
    redirect(employeesPath(slug, "?error=cupos"))
  }

  const employeesToCreate = availableEmployees.slice(0, availableSeats)
  skipped += Math.max(availableEmployees.length - employeesToCreate.length, 0)

  const activationByEmail = new Map(
    employeesToCreate.map((employee) => [employee.email, buildPendingActivationFields()]),
  )

  const createdEmployees =
    employeesToCreate.length > 0
      ? await prisma.$transaction(
          async (tx) => {
            await tx.employee.createMany({
              data: employeesToCreate.map((employee) => ({
                company_id: companyId,
                first_name: employee.nombre,
                last_name: employee.apellido,
                second_last_name: employee.apellidoMaterno,
                email: employee.email,
                curp: employee.curp,
                department: employee.departamento,
                position: employee.puesto,
                occupation_code: employee.ocupacionEspecificaClave,
                occupation_name: employee.ocupacionEspecifica,
              })),
            })

            await tx.user.createMany({
              data: employeesToCreate.map((employee) => {
                const activation = activationByEmail.get(employee.email)!
                return {
                  email: employee.email,
                  password_hash: activation.passwordHash,
                  activation_token: activation.activationToken,
                  activation_token_expires_at: activation.activationTokenExpiresAt,
                  name: `${employee.nombre} ${employee.apellido}`.trim(),
                  role: "EMPLOYEE" as const,
                  company_id: companyId,
                  active: true,
                }
              }),
            })

            await tx.company.update({
              where: { id: companyId },
              data: { used_seats: activeEmployees + employeesToCreate.length },
            })

            const persistedEmployees = await tx.employee.findMany({
              where: {
                company_id: companyId,
                email: { in: employeesToCreate.map((employee) => employee.email) },
              },
              select: {
                id: true,
                email: true,
              },
            })

            const persistedByEmail = new Map(
              persistedEmployees.map((employee) => [employee.email.toLowerCase(), employee]),
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
          },
          {
            timeout: 15_000,
          },
        )
      : []

  const created = createdEmployees.length
  let queuedSync = false

  if (isWordPressBridgeConfigured() && createdEmployees.length > 0) {
    try {
      const jobId = await enqueueCsvEmployeeBridgeSyncJob({
        companyId,
        companyName: companyContext.name,
        employees: createdEmployees.map((employee) => ({
          employeeId: employee.id,
          email: employee.email,
          firstName: employee.nombre,
          lastName: employee.apellido,
          department: employee.departamento,
          position: employee.puesto,
        })),
      })
      queuedSync = jobId !== null
    } catch (error) {
      console.error("No se pudo encolar la sincronización de empleados importados con WordPress", {
        companyId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  let activationEmailsQueued = false
  try {
    const activationEmails = createdEmployees.flatMap((employee) => {
      const activation = activationByEmail.get(employee.email)
      if (!activation) return []

      const { subject, html, text } = buildActivationEmail({
        nombreEmpleado: employee.nombre,
        nombreEmpresa: companyContext.name,
        activationUrl: buildActivationUrl(activation.activationToken),
      })
      return [{ to: employee.email, subject, html, text }]
    })

    await enqueueEmailSendJobs(activationEmails)
    activationEmailsQueued = activationEmails.length > 0
  } catch (error) {
    console.error("No se pudo encolar los correos de activación del import CSV", {
      companyId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const afterSeatSnapshot = await getCompanySeatSnapshot(companyId)
  if (afterSeatSnapshot && created > 0) {
    await createSeatHistoryEntry({
      actor,
      companyId,
      motivo: "empleados_importados_csv",
      detalle: `Importacion CSV de ${created} empleado(s).`,
      before: beforeSeatSnapshot,
      after: afterSeatSnapshot,
    })
  }

  await createAuditEvent({
    actor,
    accion: "EMPLEADOS_IMPORTADOS_CSV",
    entityType: "EMPRESA",
    entityId: companyId,
    companyId,
    resumen: `${actor.nombre} ejecuto importacion masiva CSV de empleados.`,
    metadata: {
      creados: created,
      sincronizacion_wp_encolada: queuedSync,
      correos_activacion_encolados: activationEmailsQueued,
      omitidos: skipped,
    },
  })

  revalidatePath(employeesPath(slug))
  revalidatePath(companyPath(slug, "/home"))
  revalidatePath(companyPath(slug, "/progress"))
  revalidatePath(companyPath(slug, "/certificates"))
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  redirect(
    employeesPath(
      slug,
      `?success=csv_imported&created=${created}&queued=${queuedSync ? 1 : 0}&skipped=${skipped}`,
    ),
  )
}

export async function resendActivationAction(formData: FormData) {
  const session = await requireHrSession()
  const companyId = session.user.empresa_id as string
  const slug = await requireCompanySlug(companyId)
  const employeeId = getString(formData, "empleado_id")
  const returnTo = sanitizeReturnTo(getString(formData, "return_to"), slug)

  if (!employeeId || !isUuid(employeeId)) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, company_id: companyId },
    select: { id: true, email: true, first_name: true },
  })

  if (!employee) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  const user = await prisma.user.findFirst({
    where: { email: employee.email, company_id: companyId },
    select: { id: true, activation_token: true },
  })

  if (!user || !user.activation_token) {
    redirect(withStatus(returnTo, "error", "ya_activado"))
  }

  const companyContext = await loadCompanyProvisioningContext(companyId)
  if (!companyContext) {
    redirect(withStatus(returnTo, "error", "empresa"))
  }

  const pendingActivation = buildPendingActivationFields()

  try {
    const { subject, html, text } = buildActivationEmail({
      nombreEmpleado: employee.first_name,
      nombreEmpresa: companyContext.name,
      activationUrl: buildActivationUrl(pendingActivation.activationToken),
    })
    await enqueueEmailSendJob({ to: employee.email, subject, html, text })
  } catch (error) {
    console.error("No se pudo reenviar el correo de activación", {
      employeeId: employee.id,
      error: error instanceof Error ? error.message : String(error),
    })
    redirect(withStatus(returnTo, "error", "activation_email"))
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      activation_token: pendingActivation.activationToken,
      activation_token_expires_at: pendingActivation.activationTokenExpiresAt,
    },
  })

  redirect(withStatus(returnTo, "success", "activacion_reenviada"))
}
export async function toggleEmployeeStatusAction(formData: FormData) {
  const session = await requireHrSession()
  const actor = getAuditActorFromSession(session)

  const companyId = session.user.empresa_id as string
  const slug = await requireCompanySlug(companyId)
  const employeeId = getString(formData, "empleado_id")
  const returnTo = sanitizeReturnTo(getString(formData, "return_to"), slug)

  if (!employeeId || !isUuid(employeeId)) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  const [employee, beforeSeatSnapshot] = await Promise.all([
    prisma.employee.findFirst({
      where: {
        id: employeeId,
        company_id: companyId,
      },
      select: {
        id: true,
        active: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    }),
    getCompanySeatSnapshot(companyId),
  ])

  if (!employee || !beforeSeatSnapshot) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: employee.id },
      data: { active: !employee.active },
    })

    await tx.user.updateMany({
      where: {
        email: employee.email,
        company_id: companyId,
      },
      data: { active: !employee.active },
    })

    const activeEmployees = await tx.employee.count({
      where: {
        company_id: companyId,
        active: true,
      },
    })

    await tx.company.update({
      where: { id: companyId },
      data: { used_seats: activeEmployees },
    })
  })

  const afterSeatSnapshot = await getCompanySeatSnapshot(companyId)
  if (afterSeatSnapshot) {
    await createSeatHistoryEntry({
      actor,
      companyId,
      motivo: employee.active ? "empleado_suspendido" : "empleado_reactivado",
      detalle: `${employee.first_name} ${employee.last_name} (${employee.email})`,
      before: beforeSeatSnapshot,
      after: afterSeatSnapshot,
    })
  }

  await createAuditEvent({
    actor,
    accion: employee.active ? "EMPLEADO_SUSPENDIDO" : "EMPLEADO_REACTIVADO",
    entityType: "EMPLEADO",
    entityId: employee.id,
    companyId,
    resumen: `${actor.nombre} ${employee.active ? "suspendio" : "reactivo"} al empleado ${employee.first_name} ${employee.last_name}.`,
    metadata: {
      email: employee.email,
    },
  })

  revalidatePath(employeesPath(slug))
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect(
    withStatus(returnTo, "success", employee.active ? "empleado_suspendido" : "empleado_activado"),
  )
}

export async function deleteEmployeeAction(formData: FormData) {
  const session = await requireHrSession()
  const actor = getAuditActorFromSession(session)

  const companyId = session.user.empresa_id as string
  const slug = await requireCompanySlug(companyId)
  const employeeId = getString(formData, "empleado_id")
  const returnTo = sanitizeReturnTo(getString(formData, "return_to"), slug)

  if (!employeeId || !isUuid(employeeId)) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  try {
    await deleteEmployeeRecord({
      employeeId,
      companyId,
      actor,
      source: "HR",
    })
  } catch (error) {
    const errorCode =
      error instanceof Error && error.message === "Empleado no encontrado"
        ? "empleado"
        : "bridge_delete"

    redirect(withStatus(returnTo, "error", errorCode))
  }

  revalidatePath(employeesPath(slug))
  revalidatePath(companyPath(slug, "/home"))
  revalidatePath(companyPath(slug, "/progress"))
  revalidatePath("/superadmin/access")
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect(withStatus(returnTo, "success", "empleado_eliminado"))
}

export async function triggerCompanyLearningSyncAction() {
  const session = await requireHrSession()
  const actor = getAuditActorFromSession(session)
  const companyId = session.user.empresa_id as string
  const slug = await requireCompanySlug(companyId)

  const queued = scheduleCompanyEmployeeLearningBatch(companyId, {
    limit: 100,
    staleOnly: false,
  })

  await createAuditEvent({
    actor,
    accion: queued ? "SYNC_EMPRESA_EN_COLA" : "SYNC_EMPRESA_YA_EN_COLA",
    entityType: "EMPRESA",
    entityId: companyId,
    companyId,
    resumen: `${actor.nombre} solicito sincronizacion de aprendizaje para su empresa.`,
  })

  revalidatePath(employeesPath(slug))
  revalidatePath(companyPath(slug, "/home"))
  revalidatePath(companyPath(slug, "/progress"))
  revalidatePath("/employee/courses")
  revalidatePath("/employee/certificates")
  revalidatePath("/superadmin/reports")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  redirect(
    employeesPath(
      slug,
      `?success=${queued ? "sync_background_started" : "sync_background_already_running"}`,
    ),
  )
}
