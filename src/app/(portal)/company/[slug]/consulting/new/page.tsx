import { redirect } from "next/navigation"
import { ConsultingWizard } from "@/components/company/consulting/ConsultingWizard"
import { PageHeader } from "@/components/shared/PageHeader"
import { getCompanyBranding } from "@/lib/company-branding"
import { getSession } from "@/lib/session"

export default async function CompanyNewConsultingRequestPage() {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const branding = await getCompanyBranding(session.user.empresa_id)
  if (!branding) redirect("/login")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva consultoría"
        description="Agenda una sesión en vivo con nuestro equipo de consultores"
      />
      <ConsultingWizard
        companySlug={branding.slug}
        requesterName={session.user.nombre}
        requesterEmail={session.user.email ?? ""}
      />
    </div>
  )
}
