import FirmaInstructorUpload from "@/components/portal/FirmaInstructorUpload"
import InfoCard from "@/components/portal/InfoCard"
import DeletePackageButton from "@/components/portal/DeletePackageButton"
import PackageCourseSelector from "@/components/portal/PackageCourseSelector"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import { getSuperadminPaquetesSnapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities, formatDate } from "@/lib/format"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import {
  assignPackageToCompanyAction,
  createPackageAction,
  deletePackageAction,
  syncCourseDc3MetadataAction,
  syncPackageToCompanyEmployeesAction,
  updateCourseDc3MetadataAction,
} from "./actions"

const successMessages: Record<string, string> = {
  paquete_creado: "El paquete se creo correctamente con sus cursos base y su bundle privado en Tutor LMS.",
  paquete_eliminado: "El paquete se elimino del catalogo correctamente.",
  paquete_asignado: "El paquete activo de la empresa se actualizo correctamente.",
  sync_ok: "Se sincronizaron los cursos del paquete con los empleados activos de la empresa.",
  dc3_actualizado: "La ficha DC-3 del curso se actualizo correctamente.",
  dc3_sync_ok: "La ficha DC-3 se sincronizo con datos disponibles desde WordPress/Tutor LMS.",
}

const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios para crear el paquete.",
  cursos: "Debes seleccionar al menos un curso disponible desde WordPress/Tutor LMS.",
  bundle: "No fue posible crear el bundle del paquete en Tutor LMS.",
  paquete: "No fue posible eliminar el paquete solicitado.",
  paquete_asignado: "No puedes eliminar un paquete que aun esta activo en una empresa.",
  asignacion: "No fue posible asignar el paquete a la empresa.",
  sync: "No fue posible sincronizar el paquete con la empresa. Revisa que exista paquete activo y empleados con WP user ID.",
  dc3: "No fue posible guardar la ficha DC-3 del curso.",
  dc3_sync: "No fue posible sincronizar la ficha DC-3 desde WordPress/Tutor LMS.",
}

type Dc3MetadataView = {
  wp_curso_id: number
  nombre_curso: string | null
  duracion_horas: number | null
  area_tematica_nombre: string | null
  area_tematica_clave: string | null
  agente_capacitador_nombre: string | null
  agente_capacitador_registro: string | null
  instructor_nombre: string | null
  instructor_firma_url: string | null
  fuente: string
  ultima_sincronizacion: Date | null
}

function getDc3MissingFields(metadata: Dc3MetadataView | undefined) {
  const missingFields: string[] = []

  if (!metadata?.duracion_horas) missingFields.push("duracion")
  if (!metadata?.area_tematica_nombre) missingFields.push("area tematica")
  if (!metadata?.agente_capacitador_nombre) missingFields.push("agente capacitador")
  if (!metadata?.instructor_nombre) missingFields.push("instructor")
  if (!metadata?.instructor_firma_url) missingFields.push("firma del instructor")

  return missingFields
}

function formatDurationValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return ""
  }

  return String(value)
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperAdminPaquetesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const detail = readDecodedSearchParam(params, "detail")

  const { paquetes, empresas, dc3MetadataByCourseId } = await getSuperadminPaquetesSnapshot()

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
          accent="orange"
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
          accent="slate"
        />
        <InfoCard
          title="Con bundle privado"
          value={String(packagesWithBundleReference)}
          description="Paquetes que ademas guardan referencia a un bundle privado de Tutor LMS."
          accent="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Descripcion</span>
              <textarea
                name="descripcion"
                rows={3}
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Modo de entrega B2B</span>
              <select
                name="modo_entrega"
                defaultValue="DIRECT_ENROLLMENT"
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
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
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Nombre del bundle</span>
                <input
                  name="nombre_bundle"
                  placeholder="Se llena automaticamente si el bundle se crea desde el portal"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
                />
              </label>
            </div>

            <div className="rounded-xl border border-[#E8761A]/30 bg-[#fff5ed]/70 p-4 text-sm leading-6 text-[#1a1a1a]">
              Si dejas vacio <span className="font-semibold">WP Bundle ID</span>, el portal intentara crear
              automaticamente un <span className="font-semibold">bundle privado</span> en Tutor LMS con los
              cursos seleccionados y guardara su referencia en este paquete.
            </div>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Notas operativas</span>
              <textarea
                name="notas_operativas"
                rows={3}
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Cursos del paquete</span>
              <PackageCourseSelector />
            </label>

            <button
              type="submit"
              className="inline-flex w-fit items-center rounded-full bg-[#E8761A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C45F0A]"
            >
              Guardar paquete
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
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
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
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
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
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
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-5"
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

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Catalogo de paquetes</h2>
          <p className="text-sm leading-6 text-slate-600">
            Resumen de cursos definidos por paquete y empresas que actualmente los tienen activos.
          </p>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
          {paquetes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Aun no hay paquetes registrados.
            </div>
          ) : null}

          {paquetes.map((paquete) => (
            <div key={paquete.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
              <div className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-950">{paquete.nombre}</h3>
                    <span className="rounded-full bg-[#fff5ed] px-2.5 py-1 text-xs font-semibold text-[#1a1a1a]">
                      {paquete.cursos.length} cursos
                    </span>
                  </div>

                  <DeletePackageButton
                    action={deletePackageAction}
                    paqueteId={paquete.id}
                    packageName={paquete.nombre}
                    assignedCompaniesCount={paquete.empresas.length}
                  />
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
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-6 text-amber-950">
                    <span className="font-medium">Notas operativas:</span> {paquete.notas_operativas}
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-sm font-medium text-slate-800">Cursos incluidos</p>
                  <div className="space-y-3">
                    {paquete.cursos.map((curso) => {
                      const dc3Metadata = dc3MetadataByCourseId[String(curso.wp_curso_id)] as
                        | Dc3MetadataView
                        | undefined
                      const missingFields = getDc3MissingFields(dc3Metadata)
                      const isDc3Ready = missingFields.length === 0

                      return (
                        <details
                          key={curso.id}
                          className="group rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-950">
                                {curso.wp_curso_id} - {decodeHtmlEntities(curso.nombre_curso ?? "")}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Ficha DC-3:{" "}
                                {isDc3Ready
                                  ? "lista para generar constancias"
                                  : `faltan ${missingFields.join(", ")}`}
                              </p>
                            </div>
                            <span
                              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                                isDc3Ready
                                  ? "bg-[#fff5ed] text-[#1a1a1a]"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {isDc3Ready ? "DC-3 completo" : "DC-3 pendiente"}
                            </span>
                          </summary>

                          <div className="mt-4 border-t border-slate-200 pt-4">
                            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="text-xs leading-5 text-slate-500">
                                <p>
                                  Fuente:{" "}
                                  <span className="font-semibold text-slate-700">
                                    {dc3Metadata?.fuente ?? "Sin capturar"}
                                  </span>
                                </p>
                                <p>
                                  Ultima sincronizacion:{" "}
                                  {dc3Metadata?.ultima_sincronizacion
                                    ? formatDate(dc3Metadata.ultima_sincronizacion)
                                    : "Sin fecha"}
                                </p>
                              </div>

                              <form action={syncCourseDc3MetadataAction}>
                                <input type="hidden" name="wp_curso_id" value={curso.wp_curso_id} />
                                <input type="hidden" name="nombre_curso" value={curso.nombre_curso} />
                                <button
                                  type="submit"
                                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
                                >
                                  Sincronizar desde Tutor
                                </button>
                              </form>
                            </div>

                            <form action={updateCourseDc3MetadataAction} className="grid gap-4">
                              <input type="hidden" name="wp_curso_id" value={curso.wp_curso_id} />
                              <input type="hidden" name="nombre_curso" value={curso.nombre_curso} />

                              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <label className="grid gap-1.5 text-sm">
                                  <span className="font-medium text-slate-700">
                                    Duracion en horas
                                  </span>
                                  <input
                                    name="duracion_horas"
                                    type="number"
                                    min={0}
                                    step="0.25"
                                    defaultValue={formatDurationValue(dc3Metadata?.duracion_horas)}
                                    placeholder="Ej. 12"
                                    className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
                                  />
                                </label>

                                <label className="grid gap-1.5 text-sm">
                                  <span className="font-medium text-slate-700">
                                    Area tematica
                                  </span>
                                  <input
                                    name="area_tematica_nombre"
                                    defaultValue={dc3Metadata?.area_tematica_nombre ?? ""}
                                    placeholder="Higiene y seguridad en el trabajo"
                                    className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
                                  />
                                </label>

                                <label className="grid gap-1.5 text-sm">
                                  <span className="font-medium text-slate-700">
                                    Clave area tematica
                                  </span>
                                  <input
                                    name="area_tematica_clave"
                                    defaultValue={dc3Metadata?.area_tematica_clave ?? ""}
                                    placeholder="Opcional"
                                    className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
                                  />
                                </label>

                                <label className="grid gap-1.5 text-sm">
                                  <span className="font-medium text-slate-700">
                                    Agente capacitador
                                  </span>
                                  <input
                                    name="agente_capacitador_nombre"
                                    defaultValue={dc3Metadata?.agente_capacitador_nombre ?? ""}
                                    placeholder="DesarrollaMX 360"
                                    className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
                                  />
                                </label>

                                <label className="grid gap-1.5 text-sm">
                                  <span className="font-medium text-slate-700">
                                    Registro STPS / ACE
                                  </span>
                                  <input
                                    name="agente_capacitador_registro"
                                    defaultValue={dc3Metadata?.agente_capacitador_registro ?? ""}
                                    placeholder="Si aplica"
                                    className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
                                  />
                                </label>

                                <label className="grid gap-1.5 text-sm">
                                  <span className="font-medium text-slate-700">
                                    Instructor o tutor
                                  </span>
                                  <input
                                    name="instructor_nombre"
                                    defaultValue={dc3Metadata?.instructor_nombre ?? ""}
                                    placeholder="Nombre completo"
                                    className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#E8761A]"
                                  />
                                </label>
                              </div>

                              <FirmaInstructorUpload
                                defaultUrl={dc3Metadata?.instructor_firma_url ?? ""}
                                name="instructor_firma_url"
                              />

                              <button
                                type="submit"
                                className="inline-flex w-fit items-center rounded-full bg-[#E8761A] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#C45F0A]"
                              >
                                Guardar ficha DC-3
                              </button>
                            </form>
                          </div>
                        </details>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
