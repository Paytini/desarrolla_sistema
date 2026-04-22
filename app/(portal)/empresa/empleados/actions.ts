"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { deleteEmployeeRecord } from "@/lib/access-control"
import { parseCsvText } from "@/lib/csv"
import { scheduleCompanyEmployeeLearningBatch } from "@/lib/employee-learning"
import { markEmployeeCourseAccessError, upsertEmployeePackageCourses } from "@/lib/course-sync"
import { prisma } from "@/lib/prisma"
import {
  assertAccessConfirmationSucceeded,
  assertEnrollmentSucceeded,
  assertStudentHasCourses,
  bridgeEnrollCourses,
  bridgeEnsureStudentAccess,
  bridgeGetStudentCourses,
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

async function requireRh() {
  const session = await auth()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) {
    redirect("/login")
  }

  return session
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

async function syncEmployeeWithBridge(params: {
  createdEmployee: {
    id: number
  }
  empresaId: number
  empresaNombre: string
  email: string
  nombre: string
  apellido: string
  departamento?: string | null
  puesto?: string | null
  password: string
  packageCourses: Array<{
    wp_curso_id: number
    nombre_curso: string
  }>
  accessOrigin: string
}) {
  const courseIds = params.packageCourses.map((course) => course.wp_curso_id)

  const bridgeEmployee = await bridgeUpsertEmployee({
    employeeId: params.createdEmployee.id,
    companyId: params.empresaId,
    companyName: params.empresaNombre,
    email: params.email,
    firstName: params.nombre,
    lastName: params.apellido,
    password: params.password,
    department: params.departamento ?? null,
    position: params.puesto ?? null,
  })

  await prisma.$transaction(async (tx) => {
    await tx.empleado.update({
      where: { id: params.createdEmployee.id },
      data: { wp_user_id: bridgeEmployee.wp_user_id },
    })

    await tx.usuario.updateMany({
      where: {
        email: params.email,
        empresa_id: params.empresaId,
      },
      data: { wp_user_id: bridgeEmployee.wp_user_id },
    })
  })

  if (courseIds.length > 0) {
    const enrollment = await bridgeEnrollCourses(bridgeEmployee.wp_user_id, courseIds)
    assertEnrollmentSucceeded(enrollment, courseIds)
    const accessConfirmation = await bridgeEnsureStudentAccess(bridgeEmployee.wp_user_id, courseIds)
    assertAccessConfirmationSucceeded(accessConfirmation, courseIds)
  }

  const studentCourses = await bridgeGetStudentCourses(bridgeEmployee.wp_user_id)
  if (courseIds.length > 0) {
    assertStudentHasCourses(studentCourses, courseIds)
  }

  for (const course of studentCourses.courses) {
    if (!course.wp_course_id) continue

    await prisma.empleadoCurso.upsert({
      where: {
        empleado_id_wp_curso_id: {
          empleado_id: params.createdEmployee.id,
          wp_curso_id: course.wp_course_id,
        },
      },
      update: {
        nombre_curso: course.title,
        progreso_pct: course.progress_pct,
        completado: course.completed,
        acceso_estado: "ACTIVE",
        acceso_origen: params.accessOrigin,
        acceso_error: null,
        ultimo_intento_acceso: new Date(),
        fecha_inicio_curso: course.started_at ? new Date(course.started_at) : null,
        fecha_completado: course.completed_at ? new Date(course.completed_at) : null,
        ultima_sincronizacion: new Date(),
      },
      create: {
        empleado_id: params.createdEmployee.id,
        wp_curso_id: course.wp_course_id,
        nombre_curso: course.title,
        progreso_pct: course.progress_pct,
        completado: course.completed,
        acceso_estado: "ACTIVE",
        acceso_origen: params.accessOrigin,
        acceso_error: null,
        ultimo_intento_acceso: new Date(),
        fecha_inicio_curso: course.started_at ? new Date(course.started_at) : null,
        fecha_completado: course.completed_at ? new Date(course.completed_at) : null,
        ultima_sincronizacion: new Date(),
      },
    })
  }
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

  const activeEmployees = await prisma.empleado.count({
    where: {
      empresa_id: input.empresaId,
      activo: true,
    },
  })

  if (activeEmployees >= empresaContext.asientos_contratados) {
    return {
      ok: false as const,
      code: "cupos",
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 12)
  const activePackage = empresaContext.paquetes[0]
  const packageCourses =
    activePackage?.paquete.cursos.map((curso) => ({
      wp_curso_id: curso.wp_curso_id,
      nombre_curso: curso.nombre_curso,
    })) ?? []
  const accessOrigin = activePackage?.paquete.modo_entrega ?? "DIRECT_ENROLLMENT"
  const courseIds = packageCourses.map((course) => course.wp_curso_id)

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

  if (packageCourses.length > 0) {
    await upsertEmployeePackageCourses(
      createdEmployee.id,
      packageCourses.map((course) => ({
        ...course,
        acceso_origen: accessOrigin,
      }))
    )
  }

  if (isWordPressBridgeConfigured()) {
    try {
      await syncEmployeeWithBridge({
        createdEmployee,
        empresaId: empresaContext.id,
        empresaNombre: empresaContext.nombre,
        email,
        nombre: input.nombre,
        apellido: input.apellido,
        departamento: input.departamento ?? null,
        puesto: input.puesto ?? null,
        password: input.password,
        packageCourses,
        accessOrigin,
      })

      return {
        ok: true as const,
        code: "empleado_creado_sync",
        employeeId: createdEmployee.id,
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "No fue posible confirmar el acceso academico en Tutor LMS."

      if (courseIds.length > 0) {
        await markEmployeeCourseAccessError(createdEmployee.id, courseIds, accessOrigin, message)
      }

      return {
        ok: true as const,
        code: "empleado_creado_bridge_error",
        employeeId: createdEmployee.id,
      }
    }
  }

  return {
    ok: true as const,
    code: "empleado_creado",
    employeeId: createdEmployee.id,
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
  const session = await requireRh()

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
  })

  revalidatePath("/empresa/empleados")
  revalidatePath("/empleado/cursos")

  if (!result.ok) {
    redirect(`/empresa/empleados?error=${result.code}`)
  }

  if (result.code === "empleado_creado_sync") {
    redirect("/empresa/empleados?success=empleado_creado_sync")
  }

  if (result.code === "empleado_creado_bridge_error") {
    redirect("/empresa/empleados?success=empleado_creado&error=bridge_sync")
  }

  redirect("/empresa/empleados?success=empleado_creado")
}

export async function importEmployeesCsvAction(formData: FormData) {
  const session = await requireRh()
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

  revalidatePath("/empresa/empleados")
  revalidatePath("/empresa/inicio")
  revalidatePath("/empresa/progreso")
  revalidatePath("/empresa/constancias")

  redirect(
    `/empresa/empleados?success=csv_imported&created=${created}&synced=${synced}&warnings=${bridgeWarnings}&skipped=${skipped}`
  )
}

export async function toggleEmployeeStatusAction(formData: FormData) {
  const session = await requireRh()

  const empresaId = session.user.empresa_id as number
  const empleadoId = Number.parseInt(String(formData.get("empleado_id") ?? "0"), 10)
  const returnTo = sanitizeReturnTo(getString(formData, "return_to"))

  if (!empleadoId) {
    redirect(withStatus(returnTo, "error", "empleado"))
  }

  const empleado = await prisma.empleado.findFirst({
    where: {
      id: empleadoId,
      empresa_id: empresaId,
    },
    select: {
      id: true,
      activo: true,
      email: true,
    },
  })

  if (!empleado) {
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

  revalidatePath("/empresa/empleados")
  redirect(withStatus(returnTo, "success", empleado.activo ? "empleado_suspendido" : "empleado_activado"))
}

export async function deleteEmployeeAction(formData: FormData) {
  const session = await requireRh()

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
  redirect(withStatus(returnTo, "success", "empleado_eliminado"))
}

export async function triggerCompanyLearningSyncAction() {
  const session = await requireRh()
  const empresaId = session.user.empresa_id as number

  const queued = scheduleCompanyEmployeeLearningBatch(empresaId, {
    limit: 100,
    staleOnly: false,
  })

  revalidatePath("/empresa/empleados")
  revalidatePath("/empresa/inicio")
  revalidatePath("/empresa/progreso")
  revalidatePath("/empleado/cursos")
  revalidatePath("/empleado/progreso")
  revalidatePath("/empleado/constancias")

  redirect(`/empresa/empleados?success=${queued ? "sync_background_started" : "sync_background_already_running"}`)
}
