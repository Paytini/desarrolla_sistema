"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import { CheckCircle2 } from "lucide-react"
import { createConsultingRequestAction } from "@/app/(portal)/company/[slug]/consulting/actions"
import { companyPath } from "@/lib/company-routes"
import { getConsultingArea, type ConsultingAreaId } from "@/lib/consulting-areas"
import { formatConsultingDateTime } from "@/lib/consulting-schedule"
import { AreaStep } from "./AreaStep"
import { ConfirmStep } from "./ConfirmStep"
import { ContextStep } from "./ContextStep"
import { ProgressDots } from "./ProgressDots"
import { ScheduleStep } from "./ScheduleStep"

const CONTACT_METHOD_LABELS: Record<string, string> = {
  CALL: "llamada",
  WHATSAPP: "WhatsApp",
  EMAIL: "correo",
}

type ConsultingWizardProps = {
  companySlug: string
  requesterName: string
  requesterEmail: string
}

export function ConsultingWizard({ companySlug, requesterName, requesterEmail }: ConsultingWizardProps) {
  const [step, setStep] = useState(0)
  const [area, setArea] = useState<ConsultingAreaId | null>(null)
  const [context, setContext] = useState("")
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [phone, setPhone] = useState("")
  const [contactMethod, setContactMethod] = useState("")
  const [state, formAction, pending] = useActionState(createConsultingRequestAction, null)

  const homeHref = companyPath(companySlug, "/home")

  if (state && "success" in state && state.success) {
    return (
      <Paper
        elevation={0}
        sx={{
          maxWidth: 760,
          mx: "auto",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "16px",
          p: { xs: 3, sm: 5 },
          textAlign: "center",
        }}
      >
        <Box sx={{ color: "#16a34a", mb: 2, display: "flex", justifyContent: "center" }}>
          <CheckCircle2 size={48} />
        </Box>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: "text.primary", mb: 1.5 }}>
          ¡Listo, {requesterName}!
        </Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 3, lineHeight: 1.7 }}>
          Tu sesión de {getConsultingArea(area ?? "")?.label} quedó agendada para el{" "}
          {date && time ? formatConsultingDateTime(date, time) : ""}. Te contactaremos por{" "}
          {CONTACT_METHOD_LABELS[contactMethod] ?? contactMethod} al {phone}.
        </Typography>
        <Link href={homeHref} style={{ textDecoration: "none" }}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              px: 3,
              py: 1.25,
              borderRadius: "10px",
              bgcolor: "#3579F5",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Volver al inicio
          </Box>
        </Link>
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{ maxWidth: 760, mx: "auto", border: "1px solid", borderColor: "divider", borderRadius: "16px", p: { xs: 3, sm: 5 } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
        <Link href={homeHref} style={{ fontSize: 13, color: "#6B7280", textDecoration: "none", fontWeight: 600 }}>
          ← Volver al inicio
        </Link>
        <ProgressDots steps={4} activeStep={step} />
        <Link href={homeHref} style={{ fontSize: 13, color: "#6B7280", textDecoration: "none", fontWeight: 600 }}>
          Cancelar
        </Link>
      </Box>

      <Box component="form" action={formAction}>
        <input type="hidden" name="area" value={area ?? ""} />
        <input type="hidden" name="context" value={context} />
        <input type="hidden" name="preferred_date" value={date ?? ""} />
        <input type="hidden" name="preferred_time" value={time ?? ""} />
        <input type="hidden" name="contact_phone" value={phone} />
        <input type="hidden" name="contact_method" value={contactMethod} />

        {step === 0 && <AreaStep value={area} onChange={setArea} onNext={() => setStep(1)} />}

        {step === 1 && (
          <ContextStep value={context} onChange={setContext} onBack={() => setStep(0)} onNext={() => setStep(2)} />
        )}

        {step === 2 && (
          <ScheduleStep
            date={date}
            time={time}
            onChangeDate={(newDate) => {
              setDate(newDate)
              setTime(null)
            }}
            onChangeTime={setTime}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <ConfirmStep
            areaId={area ?? ""}
            context={context}
            date={date ?? ""}
            time={time ?? ""}
            requesterName={requesterName}
            requesterEmail={requesterEmail}
            phone={phone}
            onChangePhone={setPhone}
            contactMethod={contactMethod}
            onChangeContactMethod={setContactMethod}
            onBack={() => setStep(2)}
            onEditStep={setStep}
            pending={pending}
            error={state && "error" in state ? state.error : undefined}
          />
        )}
      </Box>
    </Paper>
  )
}
