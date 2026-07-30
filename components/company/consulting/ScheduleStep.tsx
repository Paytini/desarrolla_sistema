"use client"

import { useMemo, useState } from "react"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  CONSULTING_TIME_SLOTS,
  getConsultingTimeZoneLabel,
  getMaxSelectableDate,
  getMinSelectableDate,
  isDateSelectable,
} from "@/lib/consulting-schedule"

const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"]

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const firstWeekday = firstOfMonth.getUTCDay() // 0 = Sunday
  const leadingBlanks = (firstWeekday + 6) % 7 // convert to a Monday-first grid

  const cells: (string | null)[] = Array(leadingBlanks).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
  }
  return cells
}

type ScheduleStepProps = {
  date: string | null
  time: string | null
  onChangeDate: (date: string) => void
  onChangeTime: (time: string) => void
  onBack: () => void
  onNext: () => void
}

export function ScheduleStep({ date, time, onChangeDate, onChangeTime, onBack, onNext }: ScheduleStepProps) {
  const minDate = useMemo(() => getMinSelectableDate(), [])
  const maxDate = useMemo(() => getMaxSelectableDate(), [])
  const [minYear, minMonth] = minDate.split("-").map(Number)
  const [maxYear, maxMonth] = maxDate.split("-").map(Number)

  const [viewYear, setViewYear] = useState(minYear)
  const [viewMonth, setViewMonth] = useState(minMonth - 1) // 0-indexed

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const viewKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`
  const canGoPrev = viewKey > `${minYear}-${String(minMonth).padStart(2, "0")}`
  const canGoNext = viewKey < `${maxYear}-${String(maxMonth).padStart(2, "0")}`

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3579F5", mb: 1 }}>
        Paso 3 · Fecha y hora
      </Typography>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: "text.primary", mb: 0.5 }}>
        ¿Cuándo te gustaría agendar la sesión?
      </Typography>
      <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 3 }}>
        Zona horaria: {getConsultingTimeZoneLabel()}.
      </Typography>

      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px", p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <IconButton size="small" onClick={goPrevMonth} disabled={!canGoPrev} aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </IconButton>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            {MONTH_LABELS[viewMonth]} {viewYear}
          </Typography>
          <IconButton size="small" onClick={goNextMonth} disabled={!canGoNext} aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </IconButton>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 0.5 }}>
          {WEEKDAY_LETTERS.map((label, i) => (
            <Typography key={i} sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", textAlign: "center" }}>
              {label}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
          {cells.map((iso, i) => {
            if (!iso) return <Box key={`blank-${i}`} />

            const selectable = isDateSelectable(iso)
            const selected = date === iso
            const day = Number(iso.slice(-2))

            return (
              <Box
                key={iso}
                component="button"
                type="button"
                disabled={!selectable}
                onClick={() => onChangeDate(iso)}
                sx={{
                  aspectRatio: "1",
                  borderRadius: "8px",
                  border: "none",
                  cursor: selectable ? "pointer" : "default",
                  bgcolor: selected ? "#3579F5" : "transparent",
                  color: selected ? "#FFFFFF" : selectable ? "text.primary" : "#D1D5DB",
                  fontWeight: selected ? 700 : 500,
                  fontSize: 13,
                  "&:hover": selectable ? { bgcolor: selected ? "#3579F5" : "rgba(53, 121, 245, 0.08)" } : undefined,
                }}
              >
                {day}
              </Box>
            )
          })}
        </Box>
      </Box>

      {date ? (
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 1 }}>
            Horarios disponibles
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {CONSULTING_TIME_SLOTS.map((slot) => {
              const selected = time === slot
              return (
                <Box
                  key={slot}
                  component="button"
                  type="button"
                  onClick={() => onChangeTime(slot)}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: "999px",
                    border: "1.5px solid",
                    borderColor: selected ? "#3579F5" : "#E5E7EB",
                    bgcolor: selected ? "rgba(53, 121, 245, 0.08)" : "transparent",
                    color: selected ? "#3579F5" : "text.primary",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {slot}
                </Box>
              )
            })}
          </Box>
        </Box>
      ) : null}

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
        <Button type="button" variant="outlined" onClick={onBack}>
          ← Atrás
        </Button>
        <Button type="button" variant="contained" disabled={!date || !time} onClick={onNext}>
          Continuar →
        </Button>
      </Box>
    </Box>
  )
}
