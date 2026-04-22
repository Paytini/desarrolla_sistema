import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import { formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function EmpresaConstanciasPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) {
    redirect("/login")
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.user.empresa_id },
    include: {
      empleados: {
        where: { activo: true },
        include: {
          constancias: {
            orderBy: [{ fecha_emision: "desc" }, { nombre_curso: "asc" }],
          },
          cursos: {
            orderBy: [{ completado: "desc" }, { fecha_completado: "desc" }],
          },
        },
        orderBy: { nombre: "asc" },
      },
    },
  })

  if (!empresa) {
    redirect("/login")
  }

  const constancias = empresa.empleados.flatMap((empleado) =>
    empleado.constancias.map((constancia) => ({
      ...constancia,
      empleadoNombre: `${empleado.nombre} ${empleado.apellido}`.trim(),
      empleadoEmail: empleado.email,
    }))
  )

  const pendingCertificates = empresa.empleados.flatMap((empleado) => {
    const existingCourseIds = new Set(empleado.constancias.map((certificate) => certificate.wp_curso_id))

    return empleado.cursos
      .filter((course) => course.completado && !existingCourseIds.has(course.wp_curso_id))
      .map((course) => ({
        id: `${empleado.id}-${course.wp_curso_id}`,
        empleadoNombre: `${empleado.nombre} ${empleado.apellido}`.trim(),
        empleadoEmail: empleado.email,
        courseName: course.nombre_curso,
        completedAt: course.fecha_completado,
      }))
  })

  const latestCertificate = [...constancias].sort(
    (left, right) =>
      new Date(right.fecha_emision).getTime() - new Date(left.fecha_emision).getTime()
  )[0]
  const employeesWithCertificates = new Set(constancias.map((certificate) => certificate.empleadoEmail)).size

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Empresa / RH"
        title="Constancias y reportes descargables"
        description="Aqui RH puede consultar constancias emitidas, revisar las pendientes y concentrar evidencia academica por empleado."
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Constancias emitidas"
          value={String(constancias.length)}
          description="Registros de evidencia ya visibles para los empleados activos."
          accent="teal"
        />
        <InfoCard
          title="Empleados con constancia"
          value={String(employeesWithCertificates)}
          description="Colaboradores que ya cuentan con al menos una evidencia emitida."
          accent="violet"
        />
        <InfoCard
          title="Pendientes por reflejar"
          value={String(pendingCertificates.length)}
          description="Cursos completados cuya constancia aun no se refleja en el portal."
          accent="amber"
        />
        <InfoCard
          title="Ultima emision"
          value={latestCertificate ? formatDateTime(latestCertificate.fecha_emision) : "Sin constancias"}
          description="Fecha de la evidencia mas reciente visible para la empresa."
          accent="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Constancias emitidas</h2>
            <p className="text-sm leading-6 text-slate-600">
              Evidencia centralizada por colaborador para seguimiento de cumplimiento y auditoria interna.
            </p>
          </div>

          <div className="space-y-4">
            {constancias.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no hay constancias emitidas para los empleados activos de la empresa.
              </div>
            ) : null}

            {constancias.map((constancia) => (
              <article
                key={constancia.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-950">{constancia.nombre_curso}</h3>
                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-800">Empleado:</span> {constancia.empleadoNombre}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Correo:</span> {constancia.empleadoEmail}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Folio:</span> {constancia.folio}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Emitida:</span>{" "}
                        {formatDateTime(constancia.fecha_emision)}
                      </p>
                    </div>
                  </div>

                  {constancia.wp_cert_url ? (
                    <a
                      href={constancia.wp_cert_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Ver constancia
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400">
                      La constancia existe en el portal, pero aun no trae URL publica.
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Pendientes por aparecer</h2>
            <p className="text-sm leading-6 text-slate-600">
              Cursos que ya figuran como completados, pero cuya constancia todavia no se refleja en el portal.
            </p>
          </div>

          <div className="space-y-4">
            {pendingCertificates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50 px-4 py-6 text-sm text-teal-900">
                No hay constancias pendientes. Todo lo emitido ya se refleja para RH.
              </div>
            ) : null}

            {pendingCertificates.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5"
              >
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-amber-950">{item.courseName}</h3>
                  <div className="grid gap-2 text-sm text-amber-900 md:grid-cols-1">
                    <p>
                      <span className="font-medium">Empleado:</span> {item.empleadoNombre}
                    </p>
                    <p>
                      <span className="font-medium">Correo:</span> {item.empleadoEmail}
                    </p>
                    <p>
                      <span className="font-medium">Completado:</span> {formatDateTime(item.completedAt)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
