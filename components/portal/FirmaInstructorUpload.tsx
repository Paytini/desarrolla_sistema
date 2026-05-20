"use client"

import { useEffect, useRef, useState } from "react"

// Para URLs de blob privado guardadas en la BD → proxy del servidor
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
  const [url, setUrl] = useState(defaultUrl ?? "")
  // Preview para archivos recién seleccionados (object URL del browser, no necesita proxy)
  const [localPreview, setLocalPreview] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const localPreviewRef = useRef<string>("")

  // Revocar el object URL al desmontar para liberar memoria
  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    }
  }, [])

  async function handleFile(file: File) {
    setError("")
    setUploadDone(false)

    // Mostrar preview local inmediatamente, sin depender del servidor
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    const objectUrl = URL.createObjectURL(file)
    localPreviewRef.current = objectUrl
    setLocalPreview(objectUrl)

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
    if (file) handleFile(file)
  }

  // Prioridad: preview local (recién subido) > proxy del servidor (defaultUrl desde BD)
  const shownPreview = localPreview || toServerPreviewUrl(url)

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-slate-700">Firma del instructor (PNG)</p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 transition hover:border-violet-400 hover:bg-violet-50"
      >
        {shownPreview ? (
          <img
            src={shownPreview}
            alt="Firma actual"
            className="max-h-16 max-w-[180px] object-contain"
            onError={() => {
              // Solo limpiar si era el proxy (no el preview local)
              if (!localPreview) setUrl("")
            }}
          />
        ) : (
          <span className="text-slate-400">
            {uploading
              ? "Subiendo..."
              : "Arrastra una imagen o haz clic para seleccionar"}
          </span>
        )}

        {uploading && (
          <span className="text-xs text-violet-500 animate-pulse">Subiendo al servidor...</span>
        )}
        {uploadDone && !uploading && (
          <span className="text-xs text-teal-600">✓ Guardado correctamente</span>
        )}
        {!uploading && !uploadDone && (
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
            // Reset para permitir re-selección del mismo archivo
            e.target.value = ""
          }}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        type="text"
        name={name}
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          setLocalPreview("")
          setUploadDone(false)
        }}
        placeholder="/assets/signatures/instructors/nombre.png"
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 outline-none transition focus:border-violet-600"
      />
      <p className="text-xs text-slate-400">
        También puedes escribir la URL directamente si el archivo ya existe en el servidor.
      </p>
    </div>
  )
}
