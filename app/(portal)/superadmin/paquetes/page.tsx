import InfoCard from "@/components/portal/InfoCard"
import PackageCourseSelector from "@/components/portal/PackageCourseSelector"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import { getSuperadminPaquetesSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import {
  assignPackageToCompanyAction,
  createPackageAction,
  syncPackageToCompanyEmployeesAction,
} from "./actions"

const successMessages: Record<string, string> = {
  paquete_creado: "El paquete se creo correctamente con sus cursos base y su bundle privado en Tutor LMS.",
  paquete_asignado: "El paquete activo de la empresa se actualizo correctamente.",
  sync_ok: "Se sincronizaron los cursos del paquete con los empleados activos de la empresa.",
}

const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios para crear el paquete.",
  cursos: "Debes seleccionar al menos un curso disponible desde WordPress/Tutor LMS.",
  bundle: "No fue posible crear el bundle del paquete en Tutor LMS.",
  asignacion: "No fue posible asignar el paquete a la empresa.",
  sync: "No fue posible sincronizar el paquete con la empresa. Revisa que exista paquete activo y empleados con WP user ID.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperAdminPaquetesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const detail = readDecodedSearchParam(params, "detail")

  const { paquetes, empresas } = await getSuperadminPaquetesSnapshot()

  const totalPackages = paquetes.length
  const totalCourses = paquetes.reduce((sum, paquete) => sum + paquete.cursos.length, 0)
  const assignedCompanies = empresas.filter((empresa) => empresa.paquetes.length > 0).length
  const packagesWithBundleReference = paquetes.filter((paquete) => paquete.wp_bundle_id).length

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SuperAdmin"
        title="Gestion de paquetes corporativos"
        description="Aqui puedes definir paquetes con cursos de Tutor LMS, asignarlos a empresas y lanzar la sincronizacion para que sus empleados activos queden inscritos."
      />

      {success ? <StatusNotice tone="success" message={successMessages[success] ?? success} /> : null}
      {error ? (
        <StatusNotice
          tone="error"
          message={detail ? `${errorMessages[error] ?? error} Detalle: ${detail}` : errorMessages[error] ?? error}
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Paquetes registrados"
          value={String(totalPackages)}
          description="Catalogo disponible para ventas y operaciones corporativas."
          accent="teal"
        />
        <InfoCard
          title="Cursos definidos"
          value={String(totalCourses)}
          description="Cursos Tutor LMS actualmente incluidos dentro del catalogo de paquetes."
          accent="amber"
        />
        <InfoCard
          title="Empresas con paquete activo"
          value={String(assignedCompanies)}
          description="Empresas que ya tienen paquete corporativo vigente y listo para sincronizar."
          accent="violet"
        />
        <InfoCard
          title="Con bundle privado"
          value={String(packagesWithBundleReference)}
          description="Paquetes que ademas guardan referencia a un bundle privado de Tutor LMS."
          accent="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Crear paquete</h2>
            <p className="text-sm leading-6 text-slate-600">
              Define el paquete y selecciona sus cursos directamente desde el catalogo real de Tutor LMS.
            </p>
          </div>

          <form action={createPackageAction} className="grid gap-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Nombre del paquete</span>
              <input
                name="nombre"
                required
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Descripcion</span>
              <textarea
                name="descripcion"
                rows={3}
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Modo de entrega B2B</span>
              <select
                name="modo_entrega"
                defaultValue="DIRECT_ENROLLMENT"
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
              >
                <option value="DIRECT_ENROLLMENT">Matricula directa por curso (Recomendado)</option>
                <option value="PRIVATE_BUNDLE_REFERENCE">Bundle privado como referencia operativa</option>
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">WP Bundle ID</span>
                <input
                  name="wp_bundle_id"
                  type="number"
                  min={1}
                  placeholder="Opcional si quieres reutilizar uno existente"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Nombre del bundle</span>
                <input
                  name="nombre_bundle"
                  placeholder="Se llena automaticamente si el bundle se crea desde el portal"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-sm leading-6 text-teal-950">
              Si dejas vacio <span className="font-semibold">WP Bundle ID</span>, el portal intentara crear
              automaticamente un <span className="font-semibold">bundle privado</span> en Tutor LMS con los
              cursos seleccionados y guardara su referencia en este paquete.
            </div>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Notas operativas</span>
              <textarea
                name="notas_operativas"
                rows={3}
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Cursos del paquete</span>
              <PackageCourseSelector />
            </label>

            <button
              type="submit"
              className="inline-flex w-fit items-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Guardar paquete
            </button>
          </form>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Asignar paquete a empresa</h2>
            <p className="text-sm leading-6 text-slate-600">
              Cambia el paquete activo de la empresa y despues sincroniza sus empleados activos hacia Tutor LMS.
            </p>
          </div>

          <form action={assignPackageToCompanyAction} className="grid gap-4 md:grid-cols-[1fr_1fr_0.9fr_auto] md:items-end">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Empresa</span>
              <select
                name="empresa_id"
                required
                defaultValue=""
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
              >
                <option value="">Selecciona una empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Paquete</span>
              <select
                name="paquete_id"
                required
                defaultValue=""
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
              >
                <option value="">Selecciona un paquete</option>
                {paquetes.map((paquete) => (
                  <option key={paquete.id} value={paquete.id}>
                    {paquete.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Vigencia</span>
              <input
                name="fecha_vencimiento"
                type="date"
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-[46px] items-center rounded-full bg-violet-700 px-5 text-sm font-semibold text-white transition hover:bg-violet-800"
            >
              Asignar
            </button>
          </form>

          <div className="mt-6 space-y-4">
            {empresas.map((empresa) => {
              const activePackage = empresa.paquetes[0]?.paquete?.nombre ?? "Sin paquete activo"
              const syncableEmployees = empresa.empleados.filter((empleado) => empleado.wp_user_id).length

              return (
                <div
                  key={empresa.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-slate-950">{empresa.nombre}</h3>
                      <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-800">Paquete activo:</span>{" "}
                          {activePackage}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Empleados activos:</span>{" "}
                          {empresa.empleados.length}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Con WP user ID:</span>{" "}
                          {syncableEmployees}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Creada:</span>{" "}
                          {formatDate(empresa.created_at)}
                        </p>
                      </div>
                    </div>

                    <form action={syncPackageToCompanyEmployeesAction}>
                      <input type="hidden" name="empresa_id" value={empresa.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Sincronizar cursos
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Catalogo de paquetes</h2>
          <p className="text-sm leading-6 text-slate-600">
            Resumen de cursos definidos por paquete y empresas que actualmente los tienen activos.
          </p>
        </div>

        <div className="space-y-4">
          {paquetes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Aun no hay paquetes registrados.
            </div>
          ) : null}

          {paquetes.map((paquete) => (
            <div key={paquete.id} className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold text-slate-950">{paquete.nombre}</h3>
                  <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">
                    {paquete.cursos.length} cursos
                  </span>
                </div>

                {paquete.descripcion ? (
                  <p className="text-sm leading-6 text-slate-600">{paquete.descripcion}</p>
                ) : null}

                <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p>
                    <span className="font-medium text-slate-800">Modo:</span>{" "}
                    {paquete.modo_entrega === "PRIVATE_BUNDLE_REFERENCE"
                      ? "Bundle privado + matricula directa"
                      : "Matricula directa por curso"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-800">Empresas activas:</span>{" "}
                    {paquete.empresas.length > 0
                      ? paquete.empresas.map((item) => item.empresa.nombre).join(", ")
                      : "Ninguna"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-800">Creado:</span>{" "}
                    {formatDate(paquete.created_at)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-800">Bundle privado:</span>{" "}
                    {paquete.wp_bundle_id
                      ? `${paquete.wp_bundle_id} - ${paquete.nombre_bundle ?? "Sin nombre"}`
                      : "No configurado"}
                  </p>
                </div>

                {paquete.notas_operativas ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-6 text-amber-950">
                    <span className="font-medium">Notas operativas:</span> {paquete.notas_operativas}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-sm font-medium text-slate-800">Cursos incluidos</p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {paquete.cursos.map((curso) => (
                      <li key={curso.id}>
                        {curso.wp_curso_id} - {curso.nombre_curso}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
