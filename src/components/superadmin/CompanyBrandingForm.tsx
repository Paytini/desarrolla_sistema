"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import Typography from "@mui/material/Typography"
import EyebrowLabel from "@/components/shared/EyebrowLabel"
import { storageProxyUrl } from "@/lib/storage-proxy"
import { gray } from "@/lib/theme-tokens"

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
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDraggingLogo, setIsDraggingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const autoSubmitRef = useRef(false)

  useEffect(() => {
    if (autoSubmitRef.current) {
      autoSubmitRef.current = false
      setSaving(true)
      formRef.current?.requestSubmit()
    }
  }, [logoUrl])

  function saveLogo(nextLogoUrl: string) {
    autoSubmitRef.current = true
    setLogoUrl(nextLogoUrl)
  }

  async function uploadLogo(file: File) {
    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Formato no válido. Usa PNG, JPG o WebP.")
      return
    }
    if (file.size > LOGO_MAX_SIZE_BYTES) {
      setUploadError("El archivo supera el límite de 2 MB.")
      return
    }

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
      saveLogo(data.url as string)
    } catch {
      setUploadError("Error de conexión al subir el logo")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void uploadLogo(file)
  }

  function handleLogoDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingLogo(false)
    if (uploading || saving) return
    const file = e.dataTransfer.files?.[0]
    if (file) void uploadLogo(file)
  }

  const busy = uploading || saving

  return (
    <Box component="form" ref={formRef} action={action} sx={{ display: "grid", gap: 1, p: 2.5 }}>
      <input type="hidden" name="empresa_id" value={companyId} />
      <input type="hidden" name="logo_url" value={logoUrl} />

      <EyebrowLabel>Logo de la empresa</EyebrowLabel>

      <Box
        onClick={() => !busy && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setIsDraggingLogo(true)
        }}
        onDragLeave={() => setIsDraggingLogo(false)}
        onDrop={handleLogoDrop}
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          minHeight: 200,
          p: 3,
          borderRadius: "16px",
          border: "2px dashed",
          borderColor: isDraggingLogo ? "primary.main" : uploadError ? "error.main" : "divider",
          bgcolor: isDraggingLogo ? "action.hover" : "background.default",
          cursor: busy ? "default" : "pointer",
          textAlign: "center",
          transition: "border-color 120ms ease, background-color 120ms ease",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          disabled={busy}
          onChange={handleLogoChange}
        />

        {busy ? (
          <>
            <CircularProgress size={22} thickness={4} />
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {uploading ? "Subiendo…" : "Guardando…"}
            </Typography>
          </>
        ) : logoUrl ? (
          <>
            <Button
              type="button"
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                saveLogo("")
              }}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                minWidth: 0,
                p: 0.75,
                borderRadius: "999px",
                color: "text.secondary",
              }}
            >
              <X size={16} />
            </Button>
            {/* eslint-disable-next-line @next/next/no-img-element -- private blob URL, served through the authenticated proxy */}
            <img
              src={storageProxyUrl(logoUrl)}
              alt="Logo de la empresa"
              style={{ maxWidth: 180, maxHeight: 130, objectFit: "contain" }}
            />
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Haz clic o arrastra otra imagen para cambiarla
            </Typography>
          </>
        ) : (
          <>
            <Upload size={26} strokeWidth={1.5} color={gray[400]} />
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
              Arrastra tu logo aquí o haz clic para subir
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
              PNG, JPG o WebP · máx. 2 MB
            </Typography>
          </>
        )}
      </Box>

      {uploadError && (
        <Typography sx={{ fontSize: "11px", color: "error.main" }}>{uploadError}</Typography>
      )}
    </Box>
  )
}
