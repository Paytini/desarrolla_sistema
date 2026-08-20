import { auth } from "@/auth"
import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import StatusNotice from "@/components/shared/StatusNotice"
import { BookOpen, Package, Users } from "lucide-react"
import { getHrAssignmentsSnapshot } from "@/lib/dashboard-cache"
import type { PortalPackageCourseRecord } from "@/lib/learning-types"
import { redirect } from "next/navigation"
import { companyPath } from "@/lib/company-routes"
import AssignmentBoard from "./AssignmentBoard"

type AssignmentEmployee = {
  id: string
  first_name: string
  last_name: string
  email: string
  department: string | null
  position: string | null
  courses: Array<{ wp_course_id: number }>
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export default async function CompanyAssignmentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const company = await getHrAssignmentsSnapshot(session.user.empresa_id)
  if (!company) redirect("/login")

  const activePackage = company.packages[0]?.package
  const packageCourses = (activePackage?.courses ?? []) as PortalPackageCourseRecord[]
  const allEmployees = company.employees as AssignmentEmployee[]

  const courses = packageCourses.map((course) => ({
    wp_course_id: course.wp_course_id,
    course_name: course.course_name,
    cover_url: course.cover_url ?? null,
  }))

  const employees = allEmployees.map((employee) => ({
    id: employee.id,
    name: `${employee.first_name} ${employee.last_name}`,
    email: employee.email,
    department: employee.department,
    position: employee.position,
    initials: getInitials(`${employee.first_name} ${employee.last_name}`),
  }))

  const initialAssignments: Record<number, string[]> = {}
  for (const course of packageCourses) {
    initialAssignments[course.wp_course_id] = allEmployees
      .filter((employee) => employee.courses.some((c) => c.wp_course_id === course.wp_course_id))
      .map((employee) => employee.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignación de cursos"
        description="Elige un curso en la fila superior y marca a los colaboradores que lo tomarán"
        breadcrumbs={[
          { label: "Empresa", href: companyPath(company.slug, "/home") },
          { label: "Asignaciones" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Paquete activo"
          value={activePackage?.name ?? "Sin paquete"}
          sub="Catálogo disponible"
          icon={Package}
          borderColor="amber"
        />
        <KpiCard
          label="Cursos disponibles"
          value={String(packageCourses.length)}
          sub="Para asignar a empleados"
          icon={BookOpen}
          borderColor="orange"
        />
        <KpiCard
          label="Empleados activos"
          value={String(allEmployees.length)}
          sub="Elegibles para asignación"
          icon={Users}
          borderColor="charcoal"
        />
      </div>

      {!activePackage ? (
        <StatusNotice
          tone="error"
          message="No hay paquete activo para esta empresa. Solicita a SuperAdmin que asigne un paquete para habilitar asignaciones."
        />
      ) : null}

      {activePackage && packageCourses.length > 0 ? (
        <AssignmentBoard
          courses={courses}
          employees={employees}
          initialAssignments={initialAssignments}
        />
      ) : null}
    </div>
  )
}
