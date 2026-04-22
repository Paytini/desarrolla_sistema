import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function EmpresaInicio() {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) {
    redirect("/login")
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.user.empresa_id },
    include: {
      paquetes: {
        where: { activo: true },
        orderBy: { created_at: "desc" },
        include: {
          paquete: {
            include: {
              cursos: true,
            },
          },
        },
        take: 1,
      },
      empleados: {
        where: { activo: true },
        include: {
          cursos: true,
          constancias: true,
        },
      },
    },
  })

  if (!empresa) {
    redirect("/login")
  }

  const paqueteActivo = empresa.paquetes[0]?.paquete
  const empleadosActivos = empresa.empleados.length
  const totalConstancias = empresa.empleados.reduce(
    (sum, empleado) => sum + empleado.constancias.length,
    0
  )

  const totalCourseProgress = empresa.empleados.flatMap((empleado) =>
    empleado.cursos.map((curso) => curso.progreso_pct)
  )

  const averageProgress = totalCourseProgress.length
    ? Math.round(
        totalCourseProgress.reduce((sum, progress) => sum + progress, 0) /
          totalCourseProgress.length
      )
    : 0

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Empresa / RH"
        title="Resumen de la operacion academica de la empresa"
        description="Panel para que RH vea el estado del paquete activo, el avance global de sus empleados y los puntos que requieren seguimiento."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="Paquete activo"
          value={paqueteActivo?.nombre ?? "Sin paquete activo"}
          description="Paquete actualmente asignado a la empresa para consumo de cursos corporativos."
          accent="violet"
        />
        <InfoCard
          title="Avance promedio"
          value={`${averageProgress}%`}
          description="Promedio agregado de avance entre los cursos ya sincronizados desde Tutor LMS."
          accent="teal"
        />
        <InfoCard
          title="Constancias emitidas"
          value={String(totalConstancias)}
          description="Constancias registradas actualmente para los empleados activos."
          accent="amber"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <InfoCard
          title="Objetivo de RH"
          description="Dar de alta empleados sin exceder cupos, asignar los cursos correctos y detectar rezagos antes de que afecten cumplimiento."
          accent="violet"
        />
        <InfoCard
          title="Operacion actual"
          description={`La empresa tiene ${empleadosActivos} empleados activos y ${
            paqueteActivo?.cursos.length ?? 0
          } cursos definidos en su paquete actual.`}
          accent="teal"
        />
      </section>
    </div>
  )
}
