"use client"

import { useState } from "react"

type StatusNoticeProps = {
  tone: "success" | "error"
  message: string
}

const toneClasses = {
  success: {
    container: "border-teal-200 bg-teal-50 text-teal-900",
    button: "text-teal-700 hover:bg-teal-100 hover:text-teal-950",
  },
  error: {
    container: "border-rose-200 bg-rose-50 text-rose-900",
    button: "text-rose-700 hover:bg-rose-100 hover:text-rose-950",
  },
}

export default function StatusNotice({ tone, message }: StatusNoticeProps) {
  const [visible, setVisible] = useState(true)

  if (!visible) {
    return null
  }

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone].container}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <p className="leading-6">{message}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
        className={`-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-lg leading-none transition ${toneClasses[tone].button}`}
      >
        ×
      </button>
    </div>
  )
}
