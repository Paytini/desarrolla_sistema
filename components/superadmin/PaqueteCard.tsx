import Link from "next/link"
import DeletePackageButton from "@/components/portal/DeletePackageButton"
import { Badge } from "@/components/ui/badge"
import { deletePackageAction } from "@/app/(portal)/superadmin/paquetes/actions"
import { getDc3MissingFields, type Dc3MetadataView } from "@/lib/dc3"
import type { getSuperadminPaquetesSnapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities, formatDate } from "@/lib/format"

type Paquete = Awaited<ReturnType<typeof getSuperadminPaquetesSnapshot>>["paquetes"][number]
type Dc3MetadataByCourseId = Awaited<ReturnType<typeof getSuperadminPaquetesSnapshot>>["dc3MetadataByCourseId"]

export function PaqueteCard({
  paquete,
  dc3MetadataByCourseId,
}: {
  paquete: Paquete
  dc3MetadataByCourseId: Dc3MetadataByCourseId
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground">{paquete.nombre}</h3>
          <Badge variant="secondary" className="mt-1.5">
            {paquete.cursos.length} curso{paquete.cursos.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <DeletePackageButton
          action={deletePackageAction}
          paqueteId={paquete.id}
          packageName={paquete.nombre}
          assignedCompaniesCount={paquete.empresas.length}
        />
      </div>

      {paquete.descripcion && (
        <p className="mt-2 text-sm text-muted-foreground">{paquete.descripcion}</p>
      )}

      <p className="mt-2 text-[12px] text-muted-foreground">
        Modo: {paquete.modo_entrega === "PRIVATE_BUNDLE_REFERENCE" ? "Bundle privado" : "Matrícula directa"}
        {" · "}
        Empresas: {paquete.empresas.length > 0 ? paquete.empresas.map((i) => i.empresa.nombre).join(", ") : "Ninguna"}
        {" · "}
        Creado: {formatDate(paquete.created_at)}
        {paquete.wp_bundle_id ? ` · Bundle WP: ${paquete.wp_bundle_id}` : ""}
      </p>

      {paquete.notas_operativas && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Notas:</strong> {paquete.notas_operativas}
        </div>
      )}

      {paquete.cursos.length > 0 && (
        <div className="mt-4 grid gap-2">
          {paquete.cursos.map((curso) => {
            const dc3Metadata = dc3MetadataByCourseId[String(curso.wp_curso_id)] as Dc3MetadataView | undefined
            const missingFields = getDc3MissingFields(dc3Metadata)
            const isDc3Ready = missingFields.length === 0

            return (
              <details key={curso.id} className="group rounded-md border border-border bg-muted/40 p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {curso.wp_curso_id} — {decodeHtmlEntities(curso.nombre_curso ?? "")}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {isDc3Ready
                        ? "DC-3 listo: toda la metadata está completa."
                        : `Faltan: ${missingFields.join(", ")}`}
                    </p>
                  </div>
                  <Badge
                    className={
                      isDc3Ready
                        ? "shrink-0 border-green-200 bg-green-50 text-green-700 hover:bg-green-50"
                        : "shrink-0 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
                    }
                  >
                    {isDc3Ready ? "DC-3 completo" : "DC-3 pendiente"}
                  </Badge>
                </summary>

                <div className="mt-2 grid gap-1 text-[12px] text-muted-foreground">
                  <p>
                    Fuente: <strong>{dc3Metadata?.fuente ?? "Sin capturar"}</strong>
                    {" · "}
                    Sync:{" "}
                    <strong>
                      {dc3Metadata?.ultima_sincronizacion
                        ? formatDate(dc3Metadata.ultima_sincronizacion)
                        : "Nunca"}
                    </strong>
                  </p>
                  <Link href="/superadmin/dc3" className="text-brand hover:underline">
                    Editar en DC-3 →
                  </Link>
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}
