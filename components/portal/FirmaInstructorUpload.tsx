"use client"

import { useRef, useState } from "react"

// Convierte una URL de blob privado a la ruta del proxy para mostrar en <img>
function toPreviewUrl(rawUrl: string): string {
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
  const [url, setUrl] = useState(defaultUrl ?? "")
  const [preview, setPreview] = useState(toPreviewUrl(defaultUrl ?? ""))
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError("")
    setUploading(true)

    const form = new FormData()
    form.append("file", file)
    form.append("nombre", file.name.replace(/\.[^.]+$/, ""))

    try {
      const res = await fetch("/api/upload/firma-instructor", {
        method: "POST",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al subir el archivo")
      } else {
        setUrl(data.url)
        setPreview(toPreviewUrl(data.url))
      }
    } catch {
      setError("Error de red al subir el archivo")
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-slate-700">Firma del instructor (PNG)</p>

      {/* Zona de drop / click */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 transition hover:border-violet-400 hover:bg-violet-50"
      >
        {preview ? (
          <img
            src={preview}
            alt="Firma actual"
            className="max-h-16 max-w-[180px] object-contain"
            onError={() => setPreview("")}
          />
        ) : (
          <span className="text-slate-400">
            {uploading ? "Subiendo..." : "Arrastra una imagen o haz clic para seleccionar"}
          </span>
        )}
        {!uploading && (
          <span className="text-xs text-slate-400">PNG, JPG o WebP · máx. 2 MB</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* URL resultante (editable manualmente como fallback) */}
      <input
        type="text"
        name={name}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="/assets/signatures/instructors/nombre.png"
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 outline-none transition focus:border-violet-600"
      />
      <p className="text-xs text-slate-400">
        También puedes escribir la URL directamente si el archivo ya existe en el servidor.
      </p>
    </div>
  )
}
