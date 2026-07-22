import { unstable_cache } from "next/cache"
import {
  SUPERADMIN_ACCESS_TAG,
  SUPERADMIN_DC3_TAG,
  SUPERADMIN_COMPANIES_TAG,
  SUPERADMIN_GLOBAL_TAG,
  SUPERADMIN_PACKAGES_TAG,
  SUPERADMIN_REPORTS_TAG,
  companyAssignmentsTag,
  companyCacheRootTag,
  companyEmployeesTag,
} from "@/lib/cache-tags"
import { prisma } from "@/lib/prisma"
import { getWordPressCourseCatalog } from "@/lib/wordpress-course-catalog"

const getSuperadminReportsSnapshotCached = unstable_cache(
  async () => {
    const companies = await prisma.empresa.findMany({
      orderBy: { nombre: "asc" },
      include: {
        paquetes: {
          where: { activo: true },
          orderBy: { created_at: "desc" },
          include: {
            paquete: {
              select: {
                id: true,
                nombre: true,
                modo_entrega: true,
              },
            },
          },
          take: 1,
        },
        empleados: {
          select: {
            id: true,
            activo: true,
            wp_user_id: true,
            nombre: true,
            apellido: true,
            cursos: {
              select: {
                nombre_curso: true,
                progreso_pct: true,
                completado: true,
                acceso_estado: true,
                ultima_sincronizacion: true,
              },
            },
          },
        },
      },
    })

    return { empresas: companies }
  },
  ["dashboard-snapshot", "superadmin", "reportes"],
  {
    revalidate: 60,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_REPORTS_TAG],
  }
)

export async function getSuperadminReportsSnapshot() {
  return getSuperadminReportsSnapshotCached()
}

const getSuperadminCompaniesSnapshotCached = unstable_cache(
  async () => {
    const [companies, packages] = await Promise.all([
      prisma.empresa.findMany({
        orderBy: { created_at: "desc" },
        include: {
          usuarios: {
            where: { rol: "RH" },
            select: { nombre: true, email: true, activo: true },
            take: 1,
          },
          empleados: {
            select: { id: true, activo: true },
          },
          paquetes: {
            where: { activo: true },
            orderBy: { created_at: "desc" },
            include: {
              paquete: {
                select: { nombre: true },
              },
            },
            take: 1,
          },
        },
      }),
      prisma.paquete.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
      }),
    ])

    return { empresas: companies, paquetes: packages }
  },
  ["dashboard-snapshot", "superadmin", "empresas"],
  {
    revalidate: 90,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_COMPANIES_TAG],
  }
)

export async function getSuperadminCompaniesSnapshot() {
  return getSuperadminCompaniesSnapshotCached()
}

const getSuperadminPackagesSnapshotCached = unstable_cache(
  async () => {
    const [packages, companies] = await Promise.all([
      prisma.paquete.findMany({
        where: { activo: true },
        orderBy: { created_at: "desc" },
        include: {
          cursos: {
            orderBy: { wp_curso_id: "asc" },
          },
          empresas: {
            where: { activo: true },
            include: {
              empresa: {
                select: { nombre: true },
              },
            },
          },
        },
      }),
      prisma.empresa.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
        include: {
          paquetes: {
            where: { activo: true },
            orderBy: { created_at: "desc" },
            include: {
              paquete: {
                select: { nombre: true },
              },
            },
            take: 1,
          },
          empleados: {
            where: { activo: true },
            select: { id: true, wp_user_id: true },
          },
        },
      }),
    ])

    const courseIds = [
      ...new Set(
        packages.flatMap((pkg) => pkg.cursos.map((course) => course.wp_curso_id))
      ),
    ]
    const dc3Metadata = courseIds.length > 0
      ? await prisma.cursoDc3Metadata.findMany({
          where: { wp_curso_id: { in: courseIds } },
        })
      : []
    const dc3MetadataByCourseId = Object.fromEntries(
      dc3Metadata.map((metadata) => [String(metadata.wp_curso_id), metadata])
    )

    return { paquetes: packages, empresas: companies, dc3MetadataByCourseId }
  },
  ["dashboard-snapshot", "superadmin", "paquetes"],
  {
    revalidate: 90,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_PACKAGES_TAG],
  }
)

export async function getSuperadminPackagesSnapshot() {
  return getSuperadminPackagesSnapshotCached()
}

const getSuperadminDc3SnapshotCached = unstable_cache(
  async () => {
    const [catalogResult, metadata, paqueteCursos] = await Promise.all([
      getWordPressCourseCatalog().catch(() => ({ courses: [], total: 0 })),
      prisma.cursoDc3Metadata.findMany(),
      prisma.paqueteCurso.findMany({
        select: {
          wp_curso_id: true,
          paquete: { select: { nombre: true } },
        },
      }),
    ])

    const publishedCourses = catalogResult.courses.filter((course) => course.status === "publish")

    return { publishedCourses, metadata, paqueteCursos }
  },
  ["dashboard-snapshot", "superadmin", "dc3"],
  {
    revalidate: 90,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_DC3_TAG],
  }
)

export async function getSuperadminDc3Snapshot() {
  return getSuperadminDc3SnapshotCached()
}

const getSuperadminAccessSnapshotCached = unstable_cache(
  async () => {
    const [rhUsers, employeeUsers, employees] = await Promise.all([
      prisma.usuario.findMany({
        where: { rol: "RH" },
        orderBy: [{ activo: "desc" }, { created_at: "desc" }],
        select: {
          id: true,
          nombre: true,
          email: true,
          activo: true,
          ultimo_acceso: true,
          created_at: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
              activo: true,
              asientos_contratados: true,
              asientos_usados: true,
            },
          },
        },
      }),
      prisma.usuario.findMany({
        where: { rol: "EMPLEADO" },
        select: {
          id: true,
          email: true,
          activo: true,
          ultimo_acceso: true,
        },
      }),
      prisma.empleado.findMany({
        orderBy: [{ activo: "desc" }, { created_at: "desc" }],
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          activo: true,
          wp_user_id: true,
          created_at: true,
          empresa: {
            select: {
              nombre: true,
              activo: true,
            },
          },
        },
        take: 18,
      }),
    ])

    return { rhUsers, employeeUsers, employees }
  },
  ["dashboard-snapshot", "superadmin", "accesos"],
  {
    revalidate: 45,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_ACCESS_TAG],
  }
)

export async function getSuperadminAccessSnapshot() {
  return getSuperadminAccessSnapshotCached()
}

export async function getHrEmployeesSnapshot(companyId: number) {
  const snapshot = unstable_cache(
    async () =>
      prisma.empresa.findUnique({
        where: { id: companyId },
        include: {
          empleados: {
            include: {
              cursos: {
                select: {
                  acceso_estado: true,
                },
              },
            },
            orderBy: { created_at: "desc" },
          },
          paquetes: {
            where: { activo: true },
            orderBy: { created_at: "desc" },
            include: {
              paquete: {
                select: { nombre: true },
              },
            },
            take: 1,
          },
        },
      }),
    ["dashboard-snapshot", "empresa", "empleados", String(companyId)],
    {
      revalidate: 45,
      tags: [companyCacheRootTag(companyId), companyEmployeesTag(companyId)],
    }
  )

  return snapshot()
}

export async function getHrAssignmentsSnapshot(companyId: number) {
  const snapshot = unstable_cache(
    async () =>
      prisma.empresa.findUnique({
        where: { id: companyId },
        include: {
          paquetes: {
            where: { activo: true },
            orderBy: { created_at: "desc" },
            include: {
              paquete: {
                include: {
                  cursos: {
                    orderBy: { nombre_curso: "asc" },
                  },
                },
              },
            },
            take: 1,
          },
          empleados: {
            where: { activo: true },
            include: {
              cursos: {
                select: {
                  wp_curso_id: true,
                },
              },
            },
            orderBy: [{ departamento: "asc" }, { nombre: "asc" }],
          },
        },
      }),
    ["dashboard-snapshot", "empresa", "asignaciones", String(companyId)],
    {
      revalidate: 45,
      tags: [companyCacheRootTag(companyId), companyAssignmentsTag(companyId)],
    }
  )

  return snapshot()
}
