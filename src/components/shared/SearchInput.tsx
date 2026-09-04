"use client"

import { Search, X } from "lucide-react"
import InputAdornment from "@mui/material/InputAdornment"
import IconButton from "@mui/material/IconButton"
import TextField from "@mui/material/TextField"
import { gray } from "@/lib/theme-tokens"

type SearchInputProps = {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  defaultValue?: string
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
              <Search size={14} style={{ color: gray[400] }} />
            </InputAdornment>
          ),
          endAdornment:
            isControlled && value ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  onClick={() => onChange?.("")}
                  aria-label="Limpiar búsqueda"
                  sx={{ color: gray[400], "&:hover": { color: gray[700] } }}
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
