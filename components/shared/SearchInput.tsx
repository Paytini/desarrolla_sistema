"use client"

import { Search, X } from "lucide-react"
import InputAdornment from "@mui/material/InputAdornment"
import IconButton from "@mui/material/IconButton"
import TextField from "@mui/material/TextField"

type SearchInputProps = {
  placeholder?: string
  /** Controlled value — use for client-side filtering */
  value?: string
  onChange?: (value: string) => void
  /** Uncontrolled default — use for URL-based (server) filtering */
  defaultValue?: string
  /** HTML name attribute — required for URL-based forms */
  name?: string
  width?: number | string
}

export function SearchInput({
  placeholder = "Buscar...",
  value,
  onChange,
  defaultValue,
  name,
  width = 240,
}: SearchInputProps) {
  const isControlled = value !== undefined

  return (
    <TextField
      name={name}
      value={isControlled ? value : undefined}
      defaultValue={!isControlled ? defaultValue : undefined}
      onChange={isControlled ? (e) => onChange?.(e.target.value) : undefined}
      placeholder={placeholder}
      size="small"
      autoComplete="off"
      sx={{ width }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search size={14} style={{ color: "#9CA3AF" }} />
            </InputAdornment>
          ),
          endAdornment: isControlled && value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                onClick={() => onChange?.("")}
                aria-label="Limpiar búsqueda"
                sx={{ color: "#9CA3AF", "&:hover": { color: "#374151" } }}
              >
                <X size={13} />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
    />
  )
}
