import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

import { PackageForm } from "@/components/superadmin/PackageForm"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { updatePackageAction } from "../../actions"

const errorMessages: Record<string, string> = {
  datos:  "Faltan datos obligatorios para actualizar el paquete.",
  cursos: "Debes seleccionar al menos un curso.",
  bundle: "No fue posible sincronizar el bundle en Tutor LMS.",
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function EditPackagePage({ params, searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const { id } = await params
  const packageId = Number.parseInt(id, 10)
  if (!Number.isInteger(packageId)) notFound()

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      name: true,
      description: true,
      delivery_mode: true,
      wp_bundle_id: true,
      bundle_name: true,
      operational_notes: true,
      active: true,
      courses: {
        select: { wp_course_id: true, course_name: true, cover_url: true },
      },
    },
  })

  if (!pkg || !pkg.active) notFound()

  const searchParamsValue = await searchParams
  const error  = readSearchParam(searchParamsValue, "error")
  const detail = readDecodedSearchParam(searchParamsValue, "detail")

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <Box sx={{ mb: 5 }}>
        <Link
          href="/superadmin/packages"
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            6,
            fontSize:       13,
            color:          "#64748b",
            textDecoration: "none",
            marginBottom:   12,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Paquetes
        </Link>
        <Typography
          variant="h1"
          sx={{ fontSize: "22px", fontWeight: 600, mt: 1.5, lineHeight: 1.25 }}
        >
          Editar paquete
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: "13px", color: "text.secondary" }}>
          Actualiza los datos, cursos y bundle del paquete “{pkg.name}”.
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          icon={<AlertCircle size={16} />}
          sx={{ borderRadius: 2, mb: 3 }}
        >
          {detail
            ? `${errorMessages[error] ?? error} — ${detail}`
            : (errorMessages[error] ?? error)}
        </Alert>
      )}

      <PackageForm
        action={updatePackageAction}
        submitLabel="Guardar cambios"
        initialValues={{
          id: pkg.id,
          name: pkg.name,
          description: pkg.description ?? "",
          deliveryMode: pkg.delivery_mode,
          wpBundleId: pkg.wp_bundle_id,
          bundleName: pkg.bundle_name ?? "",
          operationalNotes: pkg.operational_notes ?? "",
          courses: pkg.courses.map((course) => ({
            wp_course_id: course.wp_course_id,
            title: course.course_name,
            thumbnail_url: course.cover_url,
          })),
        }}
      />
    </Box>
  )
}
