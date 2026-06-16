"use client"

import { useState } from "react"
import Autocomplete from "@mui/material/Autocomplete"
import Box from "@mui/material/Box"
import ListSubheader from "@mui/material/ListSubheader"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { CNO_AREAS, CNO_CATALOG } from "@/lib/cno-catalog"

type CnoEntry = (typeof CNO_CATALOG)[number]

type Props = {
  defaultClave?: string | null
  defaultNombre?: string | null
}

export default function CnoSelect({ defaultClave, defaultNombre }: Props) {
  const initialEntry = defaultClave
    ? CNO_CATALOG.find((e) => e.clave === defaultClave) ?? null
    : null

  const [selected, setSelected] = useState<CnoEntry | null>(initialEntry)

  // Only include subareas (not area headers) as selectable options
  const options = CNO_CATALOG.filter((e) => !e.esArea)

  function getAreaLabel(clave: string): string {
    const area = CNO_AREAS.find((a) => clave.startsWith(a.clave + "."))
    return area ? `${area.clave} — ${area.denominacion}` : ""
  }

  return (
    <Box sx={{ gridColumn: "1 / -1" }}>
      <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 500, color: "text.primary" }}>
        Ocupación específica{" "}
        <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}>
          (CNO — Catálogo Nacional de Ocupaciones)
        </Box>
      </Typography>

      <Autocomplete
        options={options}
        groupBy={(opt) => getAreaLabel(opt.clave)}
        getOptionLabel={(opt) => `${opt.clave} — ${opt.denominacion}`}
        value={selected}
        onChange={(_, value) => setSelected(value)}
        size="small"
        noOptionsText="Sin resultados"
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Busca por clave (03.4) o nombre (Instalación...)"
          />
        )}
        renderGroup={(params) => (
          <li key={params.key}>
            <ListSubheader
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
                  sx={{ fontFamily: "monospace", fontSize: "11px", color: "text.disabled", flexShrink: 0 }}
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

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="ocupacion_especifica_clave" value={selected?.clave ?? ""} />
      <input type="hidden" name="ocupacion_especifica" value={selected?.denominacion ?? defaultNombre ?? ""} />
    </Box>
  )
}
