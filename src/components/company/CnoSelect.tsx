"use client"

import { useState } from "react"
import Autocomplete from "@mui/material/Autocomplete"
import Box from "@mui/material/Box"
import ListSubheader from "@mui/material/ListSubheader"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { CNO_AREAS, CNO_CATALOG } from "@/lib/dc3/cno-catalog"

export type CnoEntry = (typeof CNO_CATALOG)[number]

type Props = {
  defaultCode?: string | null
  defaultName?: string | null
  required?: boolean
  onSelectionChange?: (entry: CnoEntry | null) => void
}

export default function CnoSelect({
  defaultCode,
  defaultName,
  required = false,
  onSelectionChange,
}: Props) {
  const initialEntry = defaultCode
    ? (CNO_CATALOG.find((e) => e.clave === defaultCode) ?? null)
    : null

  const [selected, setSelected] = useState<CnoEntry | null>(initialEntry)
  const [touched, setTouched] = useState(false)

  const options = CNO_CATALOG.filter((e) => !e.esArea)
  const showError = required && touched && !selected

  function getAreaLabel(code: string): string {
    const area = CNO_AREAS.find((a) => code.startsWith(a.clave + "."))
    return area ? `${area.clave} — ${area.denominacion}` : ""
  }

  return (
    <Box>
      <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 400, color: "#334155" }}>
        Ocupación
      </Typography>

      <Autocomplete
        options={options}
        groupBy={(opt) => getAreaLabel(opt.clave)}
        getOptionLabel={(opt) => `${opt.clave} — ${opt.denominacion}`}
        value={selected}
        onChange={(_, value) => {
          setSelected(value)
          onSelectionChange?.(value)
        }}
        onBlur={() => setTouched(true)}
        size="small"
        noOptionsText="Sin resultados"
        renderInput={(params) => (
          <TextField
            {...params}
            required={required}
            error={showError}
            helperText={showError ? "Selecciona una ocupación de la lista" : undefined}
            placeholder="Busca por clave (03.4) o nombre (Instalación...)"
          />
        )}
        renderGroup={(params) => (
          <li key={params.key}>
            <ListSubheader
              component="div"
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "text.secondary",
                bgcolor: "background.default",
                lineHeight: "28px",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              {params.group}
            </ListSubheader>
            <ul style={{ padding: 0 }}>{params.children}</ul>
          </li>
        )}
        renderOption={(props, option) => {
          const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: React.Key }
          return (
            <li key={key} {...rest}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box
                  component="span"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "text.disabled",
                    flexShrink: 0,
                  }}
                >
                  {option.clave}
                </Box>
                <Typography sx={{ fontSize: 13, color: "text.primary" }}>
                  {option.denominacion}
                </Typography>
              </Box>
            </li>
          )
        }}
        slotProps={{
          paper: {
            sx: {
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            },
          },
        }}
      />

      <input type="hidden" name="ocupacion_especifica_clave" value={selected?.clave ?? ""} />
      <input
        type="hidden"
        name="ocupacion_especifica"
        value={selected?.denominacion ?? defaultName ?? ""}
      />
    </Box>
  )
}
