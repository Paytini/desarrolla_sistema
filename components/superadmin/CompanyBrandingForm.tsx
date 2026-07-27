"use client"

import { useRef, useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { blobProxyUrl } from "@/lib/blob-proxy"

export function CompanyBrandingForm({
  companyId,
  currentSlug,
  currentLogoUrl,
  action,
}: {
  companyId: number
  currentSlug: string
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "10px",
            border: "1px solid #E5E7EB",
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
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <Typography sx={{ fontSize: "10px", color: "#9CA3AF", textAlign: "center" }}>Sin logo</Typography>
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
          {uploadError && (
            <Typography sx={{ mt: 0.5, fontSize: "11px", color: "#dc2626" }}>{uploadError}</Typography>
          )}
        </Box>
      </Box>

      <TextField
        name="slug"
        label="Slug de la URL"
        defaultValue={currentSlug}
        size="small"
        helperText="Se usa en /company/<slug>/... Solo minúsculas, números y guiones."
        slotProps={{ htmlInput: { pattern: "[a-z0-9-]+" } }}
      />

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
