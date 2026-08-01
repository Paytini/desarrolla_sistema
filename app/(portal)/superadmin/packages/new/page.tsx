import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

import { PackageForm } from "@/components/superadmin/PackageForm"
import { getSession } from "@/lib/session"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { createPackageAction } from "../actions"

const errorMessages: Record<string, string> = {
  datos:  "Faltan datos obligatorios para crear el paquete.",
  cursos: "Debes seleccionar al menos un curso.",
  bundle: "No fue posible crear el bundle en Tutor LMS.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewPackagePage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const error  = readSearchParam(params, "error")
  const detail = readDecodedSearchParam(params, "detail")

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
          Nuevo paquete
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: "13px", color: "text.secondary" }}>
          Define un paquete con cursos de Tutor LMS y, opcionalmente, un bundle privado.
        </Typography>
      </Box>

      {error && (
        <DismissibleAlert severity="error" sx={{ mb: 3 }}>
          {detail
            ? `${errorMessages[error] ?? error} — ${detail}`
            : (errorMessages[error] ?? error)}
        </DismissibleAlert>
      )}

      <PackageForm action={createPackageAction} submitLabel="Guardar paquete" />
    </Box>
  )
}
