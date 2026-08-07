"use client"

import { useState } from "react"
import { Download, Loader2, AlertCircle } from "lucide-react"

type ZipDownloadButtonProps = {
  count: number
  filteredCount?: number
  queryString?: string
}

export function ZipDownloadButton({ count, filteredCount, queryString }: ZipDownloadButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const isFiltered = filteredCount !== undefined && filteredCount !== count

  async function handleClick() {
    if (status === "loading") return
    setStatus("loading")
    try {
      const res = await fetch(`/api/certificates/zip${queryString ?? ""}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "constancias.zip"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatus("idle")
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 4000)
    }
  }

  const isLoading = status === "loading"
  const isError   = status === "error"

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={[
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200",
        isError
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-gray-100 text-[#111827] hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed",
      ].join(" ")}
    >
      {isLoading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : isError ? (
        <AlertCircle size={12} />
      ) : (
        <Download size={12} />
      )}
      {isLoading
        ? "Descargando…"
        : isError
        ? "Error — intenta de nuevo"
        : isFiltered
        ? `Descargar ZIP (${filteredCount} filtradas)`
        : `Descargar ZIP (${count})`}
    </button>
  )
}
