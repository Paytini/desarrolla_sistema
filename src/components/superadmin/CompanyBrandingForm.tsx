"use client"

import { useRef, useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Divider from "@mui/material/Divider"
import Typography from "@mui/material/Typography"
import EyebrowLabel from "@/components/shared/EyebrowLabel"
import { blobProxyUrl } from "@/lib/blob-proxy"

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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("companyId", String(companyId))
      const res = await fetch("/api/upload/company-logo", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? "Error subiendo el logo")
        return
      }
      setLogoUrl(data.url as string)
    } catch {
      setUploadError("Error de conexión al subir el logo")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Box component="form" action={action} sx={{ display: "grid", gap: 2, p: 2.5 }}>
      <input type="hidden" name="empresa_id" value={companyId} />
      <input type="hidden" name="logo_url" value={logoUrl} />

      <Box sx={{ display: "grid", gap: 1 }}>
        <EyebrowLabel>Logo de la empresa</EyebrowLabel>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1.25 }}>
          <Box
            sx={{
              width: 180,
              height: 180,
              borderRadius: "14px",
              border: "1px solid var(--portal-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
              bgcolor: "#F9FAFB",
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- private blob URL, served through the authenticated proxy
              <img
                src={blobProxyUrl(logoUrl)}
                alt="Logo de la empresa"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            ) : (
              <Typography sx={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", px: 2 }}>
                Sin logo
              </Typography>
            )}
          </Box>

          <Box>
            <Button
              component="label"
              size="small"
              variant="outlined"
              disabled={uploading}
              sx={{ textTransform: "none", fontSize: "12px" }}
            >
              {uploading ? "Subiendo..." : "Subir logo"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={handleLogoChange}
              />
            </Button>
            <Typography sx={{ mt: 0.5, fontSize: "11px", color: "#9CA3AF" }}>
              PNG, JPG o WEBP
            </Typography>
            {uploadError && (
              <Typography sx={{ mt: 0.5, fontSize: "11px", color: "#dc2626" }}>
                {uploadError}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "#f1f5f9" }} />

      <Button
        type="submit"
        variant="contained"
        size="small"
        disabled={uploading}
        sx={{ justifySelf: "start", textTransform: "none", fontSize: "12px" }}
      >
        Guardar marca
      </Button>
    </Box>
  )
}
