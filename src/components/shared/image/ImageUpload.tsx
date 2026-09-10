"use client"

import { useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import Typography from "@mui/material/Typography"
import { storageProxyUrl } from "@/lib/storage-proxy"
import { validateImageFile } from "./validateImageFile"

type ImageUploadProps = {
  endpoint: string
  value: string
  onChange: (url: string) => void
  accept: string[]
  maxSizeBytes: number
  extraFields?: Record<string, string>
  fieldName?: string
  hint?: string
  disabled?: boolean
  busyLabel?: string
  previewFit?: "contain" | "cover"
}

export function ImageUpload({
  endpoint,
  value,
  onChange,
  accept,
  maxSizeBytes,
  extraFields,
  fieldName = "file",
  hint,
  disabled = false,
  busyLabel = "Procesando…",
  previewFit = "contain",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const busy = uploading || disabled

  async function upload(file: File) {
    const check = validateImageFile(file, { accept, maxSizeBytes })
    if (!check.ok) {
      setError(check.error)
      return
    }

    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append(fieldName, file)
      for (const [key, val] of Object.entries(extraFields ?? {})) {
        fd.append(key, val)
      }
      const res = await fetch(endpoint, { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}) as Record<string, unknown>)
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Error al subir la imagen")
        return
      }
      onChange(String(data.url ?? ""))
    } catch {
      setError("Error de conexión al subir la imagen")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Box
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (busy) return
          const file = e.dataTransfer.files?.[0]
          if (file) void upload(file)
        }}
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
          borderColor: dragging ? "primary.main" : error ? "error.main" : "divider",
          bgcolor: dragging ? "action.hover" : "background.default",
          cursor: busy ? "default" : "pointer",
          textAlign: "center",
          transition: "border-color 120ms ease, background-color 120ms ease",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          hidden
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
          }}
        />

        {busy ? (
          <>
            <CircularProgress size={22} thickness={4} />
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {uploading ? "Subiendo…" : busyLabel}
            </Typography>
          </>
        ) : value ? (
          <>
            <Button
              type="button"
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
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
            {/* eslint-disable-next-line @next/next/no-img-element -- preview de imagen subida (privada, vía proxy) */}
            <img
              src={storageProxyUrl(value)}
              alt="Vista previa"
              style={{
                maxWidth: previewFit === "cover" ? "100%" : 180,
                maxHeight: 130,
                width: previewFit === "cover" ? "100%" : undefined,
                objectFit: previewFit,
              }}
            />
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Haz clic o arrastra otra imagen para cambiarla
            </Typography>
          </>
        ) : (
          <>
            <Upload size={26} strokeWidth={1.5} />
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
              Arrastra una imagen aquí o haz clic para subir
            </Typography>
            {hint && (
              <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{hint}</Typography>
            )}
          </>
        )}
      </Box>

      {error && (
        <Typography sx={{ fontSize: "11px", color: "error.main" }}>{error}</Typography>
      )}
    </Box>
  )
}
