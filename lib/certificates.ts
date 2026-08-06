import { prisma } from "@/lib/prisma"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"

type CompanyEmployee = {
  id: number
  first_name: string
  last_name: string
  email: string
  department: string | null
  certificates: PortalCertificateRecord[]
  courses: PortalCourseRecord[]
}

export type IssuedCertificate = PortalCertificateRecord & {
  employeeName: string
  employeeEmail: string
  department: string | null
}

export type PendingCertificate = {
  id: string
  employeeName: string
  employeeEmail: string
  department: string | null
  courseName: string
  completedAt: Date | null
}

export async function getCompanyCertificatesRecord(companyId: number) {
  return prisma.company.findUnique({
    where: { id: companyId },
    include: {
      employees: {
        where: { active: true },
        include: {
          certificates: {
            orderBy: [{ issued_at: "desc" }, { course_name: "asc" }],
          },
          courses: {
            orderBy: [{ completed: "desc" }, { completed_at: "desc" }],
          },
        },
        orderBy: { first_name: "asc" },
      },
    },
  })
}

export function buildIssuedCertificates(employees: CompanyEmployee[]): IssuedCertificate[] {
  return employees.flatMap((employee) =>
    employee.certificates.map((certificate) => ({
      ...certificate,
      employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
      employeeEmail: employee.email,
      department: employee.department,
    }))
  )
}

export function buildPendingCertificates(employees: CompanyEmployee[]): PendingCertificate[] {
  return employees.flatMap((employee) => {
    const existingCourseIds = new Set(employee.certificates.map((c) => c.wp_course_id))
    return employee.courses
      .filter((course) => course.completed && !existingCourseIds.has(course.wp_course_id))
      .map((course) => ({
        id: `${employee.id}-${course.wp_course_id}`,
        employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
        employeeEmail: employee.email,
        department: employee.department,
        courseName: course.course_name,
        completedAt: course.completed_at,
      }))
  })
}

export type IssuedCertificateFilters = {
  q?: string
  department?: string
  course?: string
}

export function filterIssuedCertificates(
  certificates: IssuedCertificate[],
  filters: IssuedCertificateFilters
): IssuedCertificate[] {
  const q = filters.q?.trim().toLowerCase()
  return certificates.filter((c) => {
    if (filters.department && c.department !== filters.department) return false
    if (filters.course && c.course_name !== filters.course) return false
    if (q && !c.employeeName.toLowerCase().includes(q) && !c.course_name.toLowerCase().includes(q)) return false
    return true
  })
}

export type PendingCertificateFilters = {
  q?: string
  department?: string
}

export function filterPendingCertificates(
  certificates: PendingCertificate[],
  filters: PendingCertificateFilters
): PendingCertificate[] {
  const q = filters.q?.trim().toLowerCase()
  return certificates.filter((c) => {
    if (filters.department && c.department !== filters.department) return false
    if (q && !c.employeeName.toLowerCase().includes(q) && !c.courseName.toLowerCase().includes(q)) return false
    return true
  })
}

export function getDistinctDepartments(employees: CompanyEmployee[]): string[] {
  return [...new Set(employees.map((e) => e.department).filter((v): v is string => Boolean(v)))].sort()
}

export function getDistinctCourseNames(certificates: IssuedCertificate[]): string[] {
  return [...new Set(certificates.map((c) => c.course_name))].sort()
}
