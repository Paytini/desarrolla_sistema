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
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      include: {
        packages: {
          where: { active: true },
          orderBy: { created_at: "desc" },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                delivery_mode: true,
              },
            },
          },
          take: 1,
        },
        employees: {
          select: {
            id: true,
            active: true,
            wp_user_id: true,
            first_name: true,
            last_name: true,
            courses: {
              select: {
                course_name: true,
                progress_pct: true,
                completed: true,
                access_status: true,
                last_synced_at: true,
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
      prisma.company.findMany({
        orderBy: { created_at: "desc" },
        include: {
          users: {
            where: { role: "RH" },
            select: { name: true, email: true, active: true },
            take: 1,
          },
          employees: {
            select: { id: true, active: true },
          },
          packages: {
            where: { active: true },
            orderBy: { created_at: "desc" },
            include: {
              package: {
                select: { name: true },
              },
            },
            take: 1,
          },
        },
      }),
      prisma.package.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
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
      prisma.package.findMany({
        where: { active: true },
        orderBy: { created_at: "desc" },
        include: {
          courses: {
            orderBy: { wp_course_id: "asc" },
          },
          companies: {
            where: { active: true },
            include: {
              company: {
                select: { name: true },
              },
            },
          },
        },
      }),
      prisma.company.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        include: {
          packages: {
            where: { active: true },
            orderBy: { created_at: "desc" },
            include: {
              package: {
                select: { name: true },
              },
            },
            take: 1,
          },
          employees: {
            where: { active: true },
            select: { id: true, wp_user_id: true },
          },
        },
      }),
    ])

    const courseIds = [
      ...new Set(
        packages.flatMap((pkg) => pkg.courses.map((course) => course.wp_course_id))
      ),
    ]
    const dc3Metadata = courseIds.length > 0
      ? await prisma.courseDc3Metadata.findMany({
          where: { wp_course_id: { in: courseIds } },
        })
      : []
    const dc3MetadataByCourseId = Object.fromEntries(
      dc3Metadata.map((metadata) => [String(metadata.wp_course_id), metadata])
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
      prisma.courseDc3Metadata.findMany(),
      prisma.packageCourse.findMany({
        select: {
          wp_course_id: true,
          package: { select: { name: true } },
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

const getSuperadminAccessRhSnapshotCached = unstable_cache(
  async () => {
    return prisma.user.findMany({
      where: { role: "RH" },
      orderBy: [{ active: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        last_access: true,
        created_at: true,
        company: {
          select: {
            id: true,
            name: true,
            active: true,
            contracted_seats: true,
            used_seats: true,
          },
        },
      },
    })
  },
  ["dashboard-snapshot", "superadmin", "accesos", "rh"],
  {
    revalidate: 45,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_ACCESS_TAG],
  }
)

export const EMPLOYEES_ACCESS_PAGE_SIZE = 20

const getSuperadminAccessEmployeesSnapshotCached = unstable_cache(
  async (query: string, page: number) => {
    const where = query
      ? {
          OR: [
            { first_name: { contains: query, mode: "insensitive" as const } },
            { last_name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { company: { name: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}

    const [grandTotal, total, employees] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        orderBy: [{ active: "desc" }, { created_at: "desc" }],
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          active: true,
          wp_user_id: true,
          created_at: true,
          company: {
            select: {
              name: true,
              active: true,
            },
          },
        },
        skip: (page - 1) * EMPLOYEES_ACCESS_PAGE_SIZE,
        take: EMPLOYEES_ACCESS_PAGE_SIZE,
      }),
    ])

    const employeeUsers = await prisma.user.findMany({
      where: { role: "EMPLEADO", email: { in: employees.map((e) => e.email) } },
      select: {
        id: true,
        email: true,
        active: true,
        last_access: true,
      },
    })

    return { employees, employeeUsers, total, grandTotal }
  },
  ["dashboard-snapshot", "superadmin", "accesos", "empleados"],
  {
    revalidate: 45,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_ACCESS_TAG],
  }
)

export async function getSuperadminAccessSnapshot(employeeQuery: string, employeePage: number) {
  const [rhUsers, employeesData] = await Promise.all([
    getSuperadminAccessRhSnapshotCached(),
    getSuperadminAccessEmployeesSnapshotCached(employeeQuery, employeePage),
  ])
  return { rhUsers, ...employeesData }
}

export async function getHrEmployeesSnapshot(companyId: string) {
  const snapshot = unstable_cache(
    async () =>
      prisma.company.findUnique({
        where: { id: companyId },
        include: {
          employees: {
            include: {
              courses: {
                select: {
                  access_status: true,
                },
              },
            },
            orderBy: { created_at: "desc" },
          },
          packages: {
            where: { active: true },
            orderBy: { created_at: "desc" },
            include: {
              package: {
                select: { name: true },
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

export async function getHrAssignmentsSnapshot(companyId: string) {
  const snapshot = unstable_cache(
    async () =>
      prisma.company.findUnique({
        where: { id: companyId },
        include: {
          packages: {
            where: { active: true },
            orderBy: { created_at: "desc" },
            include: {
              package: {
                include: {
                  courses: {
                    orderBy: { course_name: "asc" },
                  },
                },
              },
            },
            take: 1,
          },
          employees: {
            where: { active: true },
            include: {
              courses: {
                select: {
                  wp_course_id: true,
                },
              },
            },
            orderBy: [{ department: "asc" }, { first_name: "asc" }],
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
