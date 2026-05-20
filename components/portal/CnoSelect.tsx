"use client"

import { useState } from "react"
import { CNO_CATALOG, CNO_AREAS } from "@/lib/cno-catalog"

type Props = {
  defaultClave?: string | null
  defaultNombre?: string | null
}

export default function CnoSelect({ defaultClave, defaultNombre }: Props) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [clave, setClave] = useState(defaultClave ?? "")
  const [nombre, setNombre] = useState(defaultNombre ?? "")

  const filtered = query.length >= 1
    ? CNO_CATALOG.filter((e) =>
        e.clave.includes(query) ||
        e.denominacion.toLowerCase().includes(query.toLowerCase())
      )
    : CNO_CATALOG

  function select(selectedClave: string, selectedNombre: string) {
    setClave(selectedClave)
    setNombre(selectedNombre)
    setQuery(`${selectedClave} — ${selectedNombre}`)
    setOpen(false)
  }

  function handleInputChange(value: string) {
    setQuery(value)
    setClave("")
    setNombre("")
    setOpen(true)
  }

  return (
    <div className="relative col-span-full">
      <p className="mb-2 text-sm font-medium text-slate-700">
        Ocupación específica{" "}
        <span className="font-normal text-slate-400">(CNO — Catálogo Nacional de Ocupaciones)</span>
      </p>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Busca por clave (03.4) o nombre (Instalación...)"
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-600"
        />
        {clave && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
            {clave}
          </span>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {CNO_AREAS.map((area) => {
            const subareas = filtered.filter(
              (e) => !e.esArea && e.clave.startsWith(area.clave + ".")
            )
            const areaMatch = filtered.some(
              (e) => e.esArea && e.clave === area.clave
            )

            if (subareas.length === 0 && !areaMatch) return null

            return (
              <li key={area.clave}>
                {/* Encabezado de área */}
                <div
                  className="cursor-pointer bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                  onMouseDown={() => select(area.clave, area.denominacion)}
                >
                  {area.clave} — {area.denominacion}
                </div>
                {/* Subáreas */}
                {subareas.map((sub) => (
                  <div
                    key={sub.clave}
                    className="cursor-pointer px-5 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-900"
                    onMouseDown={() => select(sub.clave, sub.denominacion)}
                  >
                    <span className="mr-2 font-mono text-xs font-semibold text-slate-400">
                      {sub.clave}
                    </span>
                    {sub.denominacion}
                  </div>
                ))}
              </li>
            )
          })}
        </ul>
      )}

      {/* Campos ocultos que se envían al server action */}
      <input type="hidden" name="ocupacion_especifica_clave" value={clave} />
      <input type="hidden" name="ocupacion_especifica" value={nombre} />
    </div>
  )
}
