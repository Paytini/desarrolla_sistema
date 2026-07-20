"use client"

import { Info, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export default function CurpInfoButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Información sobre el formato CURP"
        className="text-slate-400 transition-colors hover:text-[#3579F5]"
      >
        <Info size={13} />
      </button>

      {open && (
        <div className="absolute left-6 top-0 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-800">Formato CURP</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Cerrar"
            >
              <X size={13} />
            </button>
          </div>

          <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
            18 caracteres alfanuméricos asignados por el RENAPO a cada persona nacida en México.
          </p>

          <div className="mb-3 space-y-1.5">
            <Row pos="1–4" desc="Letras: 2 del apellido paterno + 1 materno + 1 nombre" />
            <Row pos="5–10" desc="Fecha de nacimiento (AAMMDD)" />
            <Row pos="11" desc='Sexo: H (hombre) o M (mujer)' />
            <Row pos="12–13" desc="Clave del estado de nacimiento (ej. BC, NL, DF)" />
            <Row pos="14–16" desc="Consonantes internas de apellidos y nombre" />
            <Row pos="17–18" desc="Homoclave y dígito verificador del RENAPO" />
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-center font-mono text-[12px] tracking-widest text-slate-700">
            <span className="text-slate-800">PEAA</span>
            <span className="text-blue-500">900101</span>
            <span className="text-green-600">H</span>
            <span className="text-purple-500">BC</span>
            <span className="text-slate-800">XXX</span>
            <span className="text-orange-500">01</span>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">Ejemplo ilustrativo</p>
        </div>
      )}
    </div>
  )
}

function Row({ pos, desc }: { pos: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-slate-600">
      <span className="shrink-0 rounded bg-[#EAF1FE] px-1.5 py-0.5 font-mono text-[10px] text-[#3579F5]">
        {pos}
      </span>
      <span className="leading-relaxed">{desc}</span>
    </div>
  )
}
