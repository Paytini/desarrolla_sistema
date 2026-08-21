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
} from "@/lib/cache-tags"
import { prisma } from "@/lib/prisma"
import { getWordPressCourseCatalog } from "@/lib/wordpress-course-catalog"

const REPORTS_STALE_SYNC_MS = 1000 * 60 * 60 * 24

type CompanyKpiRow = {
  company_id: string
  active_employees: number
  suspended_employees: number
  employees_without_wp_user: number
  total_courses: number
  total_progress: number
  completed_courses: number
  not_started_courses: number
  error_courses: number
  pending_courses: number
  stale_courses: number
  employees_without_courses: number
}

const EMPTY_COMPANY_KPI: Omit<CompanyKpiRow, "company_id"> = {
  active_employees: 0,
  suspended_employees: 0,
  employees_without_wp_user: 0,
  total_courses: 0,
  total_progress: 0,
  completed_courses: 0,
  not_started_courses: 0,
  error_courses: 0,
  pending_courses: 0,
  stale_courses: 0,
  employees_without_courses: 0,
}

const getSuperadminReportsSnapshotCached = unstable_cache(
  async () => {
    const staleThreshold = new Date(Date.now() - REPORTS_STALE_SYNC_MS)

    const [companies, kpiRows] = await Promise.all([
      prisma.company.findMany({
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
        },
      }),
      prisma.$queryRaw<CompanyKpiRow[]>`
        SELECT
          c.id AS company_id,
          COUNT(DISTINCT CASE WHEN e.active THEN e.id END)::int AS active_employees,
          COUNT(DISTINCT CASE WHEN NOT e.active THEN e.id END)::int AS suspended_employees,
          COUNT(DISTINCT CASE WHEN e.active AND e.wp_user_id IS NULL THEN e.id END)::int AS employees_without_wp_user,
          COUNT(ec.id) FILTER (WHERE e.active)::int AS total_courses,
          COALESCE(SUM(ec.progress_pct) FILTER (WHERE e.active), 0)::int AS total_progress,
          COUNT(ec.id) FILTER (WHERE e.active AND ec.completed)::int AS completed_courses,
          COUNT(ec.id) FILTER (WHERE e.active AND NOT ec.completed AND ec.progress_pct = 0)::int AS not_started_courses,
          COUNT(ec.id) FILTER (WHERE e.active AND ec.access_status = 'ERROR')::int AS error_courses,
          COUNT(ec.id) FILTER (WHERE e.active AND ec.access_status IN ('PENDING', 'REQUIRES_REVIEW'))::int AS pending_courses,
          COUNT(ec.id) FILTER (WHERE e.active AND ec.last_synced_at < ${staleThreshold})::int AS stale_courses,
          COUNT(DISTINCT CASE WHEN e.active AND ec.id IS NULL THEN e.id END)::int AS employees_without_courses
        FROM companies c
        LEFT JOIN employees e ON e.company_id = c.id
        LEFT JOIN employee_courses ec ON ec.employee_id = e.id
        GROUP BY c.id
      `,
    ])

    const kpiByCompanyId = new Map(kpiRows.map((row) => [row.company_id, row]))

    const empresas = companies.map((company) => {
      const kpi = kpiByCompanyId.get(company.id) ?? EMPTY_COMPANY_KPI

      return {
        ...company,
        activeEmployees: kpi.active_employees,
        suspendedEmployees: kpi.suspended_employees,
        employeesWithoutWpUser: kpi.employees_without_wp_user,
        totalCourses: kpi.total_courses,
        averageProgress: kpi.total_courses ? Math.round(kpi.total_progress / kpi.total_courses) : 0,
        completedCourses: kpi.completed_courses,
        notStartedCourses: kpi.not_started_courses,
        errorCourses: kpi.error_courses,
        pendingCourses: kpi.pending_courses,
        staleCourses: kpi.stale_courses,
        employeesWithoutCourses: kpi.employees_without_courses,
      }
    })

    return { empresas }
  },
  ["dashboard-snapshot", "superadmin", "reportes"],
  {
    revalidate: 60,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_REPORTS_TAG],
  },
)

export async function getSuperadminReportsSnapshot() {
  return getSuperadminReportsSnapshotCached()
}

const ACTIVITY_WINDOW_DAYS = 14

type CompanyActivityRow = {
  company_id: string
  sync_day: Date
  count: number
}

const getSuperadminCourseActivitySnapshotCached = unstable_cache(
  async () => {
    const windowStart = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    const rows = await prisma.$queryRaw<CompanyActivityRow[]>`
      SELECT c.id AS company_id, DATE(ec.last_synced_at) AS sync_day, COUNT(*)::int AS count
      FROM employee_courses ec
      JOIN employees e ON e.id = ec.employee_id
      JOIN companies c ON c.id = e.company_id
      WHERE ec.last_synced_at >= ${windowStart}
      GROUP BY c.id, DATE(ec.last_synced_at)
    `

    return {
      byCompanyAndDay: rows.map((row) => ({
        companyId: row.company_id,
        day: row.sync_day.toISOString().slice(0, 10),
        count: row.count,
      })),
    }
  },
  ["dashboard-snapshot", "superadmin", "actividad"],
  {
    revalidate: 60,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_REPORTS_TAG],
  },
)

export async function getSuperadminCourseActivitySnapshot() {
  return getSuperadminCourseActivitySnapshotCached()
}

const getSuperadminCompaniesSnapshotCached = unstable_cache(
  async () => {
    const [companies, packages] = await Promise.all([
      prisma.company.findMany({
        orderBy: { created_at: "desc" },
        include: {
          users: {
            where: { role: "HR" },
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
  },
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
      ...new Set(packages.flatMap((pkg) => pkg.courses.map((course) => course.wp_course_id))),
    ]
    const dc3Metadata =
      courseIds.length > 0
        ? await prisma.courseDc3Metadata.findMany({
            where: { wp_course_id: { in: courseIds } },
          })
        : []
    const dc3MetadataByCourseId = Object.fromEntries(
      dc3Metadata.map((metadata) => [String(metadata.wp_course_id), metadata]),
    )

    return { paquetes: packages, empresas: companies, dc3MetadataByCourseId }
  },
  ["dashboard-snapshot", "superadmin", "paquetes"],
  {
    revalidate: 90,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_PACKAGES_TAG],
  },
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
  },
)

export async function getSuperadminDc3Snapshot() {
  return getSuperadminDc3SnapshotCached()
}

const getSuperadminAccessHrSnapshotCached = unstable_cache(
  async () => {
    return prisma.user.findMany({
      where: { role: "HR" },
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
  ["dashboard-snapshot", "superadmin", "accesos", "hr"],
  {
    revalidate: 45,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_ACCESS_TAG],
  },
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
      where: { role: "EMPLOYEE", email: { in: employees.map((e) => e.email) } },
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
  },
)

export async function getSuperadminAccessSnapshot(employeeQuery: string, employeePage: number) {
  const [hrUsers, employeesData] = await Promise.all([
    getSuperadminAccessHrSnapshotCached(),
    getSuperadminAccessEmployeesSnapshotCached(employeeQuery, employeePage),
  ])
  return { hrUsers, ...employeesData }
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
    },
  )

  return snapshot()
}
