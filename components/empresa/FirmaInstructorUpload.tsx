"use client"

import { useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

function toServerPreviewUrl(rawUrl: string): string {
  if (!rawUrl) return ""
  if (rawUrl.includes("blob.vercel-storage.com")) {
    return `/api/upload/firma-proxy?url=${encodeURIComponent(rawUrl)}`
  }
  return rawUrl
}

type Props = {
  defaultUrl?: string | null
  name?: string
}

export default function FirmaInstructorUpload({
  defaultUrl,
  name = "instructor_firma_url",
}: Props) {
  const [url, setUrl]                 = useState(defaultUrl ?? "")
  const [localPreview, setLocalPreview] = useState("")
  const [uploading, setUploading]     = useState(false)
  const [uploadDone, setUploadDone]   = useState(false)
  const [error, setError]             = useState("")
  const inputRef      = useRef<HTMLInputElement>(null)
  const localPreviewRef = useRef<string>("")

  useEffect(() => {
    return () => { if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current) }
  }, [])

  async function handleFile(file: File) {
    setError("")
    setUploadDone(false)
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    const objectUrl = URL.createObjectURL(file)
    localPreviewRef.current = objectUrl
    setLocalPreview(objectUrl)
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    form.append("nombre", file.name.replace(/\.[^.]+$/, ""))
    try {
      const res = await fetch("/api/upload/firma-instructor", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al subir el archivo")
        setLocalPreview("")
      } else {
        setUrl(data.url)
        setUploadDone(true)
      }
    } catch {
      setError("Error de red al subir el archivo")
      setLocalPreview("")
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const shownPreview = localPreview || toServerPreviewUrl(url)

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 500, color: "text.primary" }}>
        Firma del instructor (PNG)
      </Typography>

      {/* Drop zone */}
      <Box
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.default",
          px: 2,
          py: 2.5,
          cursor: "pointer",
          transition: "border-color 0.15s, background-color 0.15s",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "rgba(245,133,63,0.04)",
          },
        }}
      >
        {shownPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownPreview}
            alt="Firma actual"
            style={{ maxHeight: 64, maxWidth: 180, objectFit: "contain" }}
            onError={() => { if (!localPreview) setUrl("") }}
          />
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {uploading ? "Subiendo..." : "Arrastra una imagen o haz clic para seleccionar"}
          </Typography>
        )}

        {uploading && (
          <Typography sx={{ fontSize: 11, color: "primary.main" }}>
            Subiendo al servidor...
          </Typography>
        )}
        {uploadDone && !uploading && (
          <Typography sx={{ fontSize: 11, color: "#15803d" }}>✓ Guardado correctamente</Typography>
        )}
        {!uploading && !uploadDone && (
          <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
            PNG, JPG o WebP · máx. 2 MB
          </Typography>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ""
          }}
        />
      </Box>

      {error && (
        <Typography sx={{ fontSize: 12, color: "error.main" }}>{error}</Typography>
      )}

      <TextField
        value={url}
        onChange={(e) => { setUrl(e.target.value); setLocalPreview(""); setUploadDone(false) }}
        name={name}
        placeholder="/assets/signatures/instructors/nombre.png"
        size="small"
        fullWidth
      />
      <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
        También puedes escribir la URL directamente si el archivo ya existe en el servidor.
      </Typography>
    </Box>
  )
}
