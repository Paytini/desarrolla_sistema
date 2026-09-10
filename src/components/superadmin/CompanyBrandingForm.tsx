"use client"

import { useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import EyebrowLabel from "@/components/shared/EyebrowLabel"
import { ImageUpload } from "@/components/shared/image/ImageUpload"

const LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024

export function CompanyBrandingForm({
  companyId,
  currentLogoUrl,
  action,
}: {
  companyId: string
  currentLogoUrl: string | null
  action: (formData: FormData) => void
}) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl ?? "")
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const autoSubmitRef = useRef(false)

  useEffect(() => {
    if (autoSubmitRef.current) {
      autoSubmitRef.current = false
      setSaving(true)
      formRef.current?.requestSubmit()
    }
  }, [logoUrl])

  function handleLogoChange(nextLogoUrl: string) {
    autoSubmitRef.current = true
    setLogoUrl(nextLogoUrl)
  }

  return (
    <Box component="form" ref={formRef} action={action} sx={{ display: "grid", gap: 1, p: 2.5 }}>
      <input type="hidden" name="empresa_id" value={companyId} />
      <input type="hidden" name="logo_url" value={logoUrl} />

      <EyebrowLabel>Logo de la empresa</EyebrowLabel>

      <ImageUpload
        endpoint="/api/upload/company-logo"
        extraFields={{ companyId }}
        value={logoUrl}
        onChange={handleLogoChange}
        accept={LOGO_ALLOWED_TYPES}
        maxSizeBytes={LOGO_MAX_SIZE_BYTES}
        hint="PNG, JPG o WebP · máx. 2 MB"
        disabled={saving}
        busyLabel="Guardando…"
      />
    </Box>
  )
}
