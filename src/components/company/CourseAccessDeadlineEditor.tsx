"use client"

import { useState, useTransition } from "react"
import Box from "@mui/material/Box"
import { CalendarClock } from "lucide-react"
import ActionsPopover from "@/components/shared/ActionsPopover"
import { formatDate } from "@/lib/format"
import { updateCourseAccessDeadlineAction } from "@/app/(portal)/company/[slug]/employees/actions"

type CourseAccessDeadlineEditorProps = {
  employeeId: string
  wpCourseId: number
  currentDeadline: Date | null
  expired: boolean
}

export default function CourseAccessDeadlineEditor({
  employeeId,
  wpCourseId,
  currentDeadline,
  expired,
}: CourseAccessDeadlineEditorProps) {
  const [value, setValue] = useState(currentDeadline ? currentDeadline.toISOString().slice(0, 10) : "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(nextValue: string, close: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await updateCourseAccessDeadlineAction(employeeId, wpCourseId, nextValue)
      if (result.ok) {
        close()
      } else {
        setError(result.error ?? "No se pudo actualizar la fecha límite.")
      }
    })
  }

  return (
    <ActionsPopover
      placement="bottom-start"
      trigger={({ toggle, setAnchorEl, open }) => (
        <Box
          ref={setAnchorEl}
          component="button"
          type="button"
          onClick={toggle}
          aria-haspopup="true"
          aria-expanded={open}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
            expired
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              : currentDeadline
                ? "border-portal-border bg-white text-slate-600 hover:bg-gray-50"
                : "border-dashed border-portal-border text-slate-400 hover:bg-gray-50"
          }`}
        >
          <CalendarClock size={12} strokeWidth={2} />
          {expired
            ? `Vencido el ${formatDate(currentDeadline!)}`
            : currentDeadline
              ? `Límite: ${formatDate(currentDeadline)}`
              : "Sin fecha límite"}
        </Box>
      )}
    >
      {({ close }) => (
        <Box sx={{ p: 2, width: 240 }}>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Fecha límite de acceso
          </label>
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mb-2 w-full rounded-lg border border-portal-border px-3 py-2 text-sm outline-none transition focus:border-portal-blue"
          />
          {error ? <p className="mb-2 text-xs text-rose-600">{error}</p> : null}
          <div className="flex items-center justify-between gap-2">
            {currentDeadline ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setValue("")
                  save("", close)
                }}
                className="text-xs font-semibold text-slate-500 hover:underline disabled:opacity-50"
              >
                Quitar fecha
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={() => save(value, close)}
              className="rounded-full bg-portal-blue px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-portal-blue-hover disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Box>
      )}
    </ActionsPopover>
  )
}
