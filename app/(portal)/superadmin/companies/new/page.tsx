import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

import { CreateCompanyWizard } from "@/components/superadmin/CreateCompanyWizard"
import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { getSession } from "@/lib/session"

export default async function NuevaEmpresaPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const { paquetes } = await getSuperadminEmpresasSnapshot()

  return (
    <Box sx={{ maxWidth: 840, mx: "auto" }}>
      <Box sx={{ mb: 5 }}>
        <Link
          href="/superadmin/companies"
          style={{
            display:     "inline-flex",
            alignItems:  "center",
            gap:         6,
            fontSize:    13,
            color:       "#64748b",
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Empresas
        </Link>
        <Typography
          variant="h1"
          sx={{ fontSize: "22px", fontWeight: 600, mt: 1.5, lineHeight: 1.25 }}
        >
          Nueva empresa
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: "13px", color: "text.secondary" }}>
          Completa los tres pasos para registrar la empresa y su acceso RH inicial.
        </Typography>
      </Box>

      <CreateCompanyWizard paquetes={paquetes} />
    </Box>
  )
}
