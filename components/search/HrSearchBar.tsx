"use client"

import type { ElementType } from "react"
import Link from "next/link"
import { BookOpen, Users } from "lucide-react"

import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

import SearchPalette from "./SearchPalette"
import { companyPath } from "@/lib/company-routes"

type EmployeeResult = {
  id: number
  first_name: string
  last_name: string
  email: string
  department: string | null
}
type CourseResult = { wp_course_id: number; course_name: string }
type SearchResults = { employees: EmployeeResult[]; courses: CourseResult[] }

export default function HrSearchBar({ companySlug }: { companySlug: string }) {
  return (
    <SearchPalette<SearchResults>
      searchUrl={(q) => `/api/internal/hr-search?q=${encodeURIComponent(q)}`}
      placeholder="Buscar empleados o cursos..."
      triggerLabel="Buscar en el portal"
      triggerWidth="100%"
      dark
      iconOnly
      renderGroups={(results, query, onClose) => {
        const hasResults = results.employees.length > 0 || results.courses.length > 0

        if (!hasResults) {
          return (
            <Box sx={{ px: 2, py: 5, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Sin resultados para{" "}
                <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                  &ldquo;{query}&rdquo;
                </Box>
              </Typography>
            </Box>
          )
        }

        return (
          <Box sx={{ py: 1 }}>
            {results.employees.length > 0 && (
              <Box component="section">
                <GroupHeader icon={Users} label="Empleados" count={results.employees.length} />
                {results.employees.map((e) => (
                  <ResultRow
                    key={e.id}
                    href={companyPath(companySlug, "/employees")}
                    onClose={onClose}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: "6px",
                          bgcolor: "#f1f5f9",
                          color: "#64748b",
                          flexShrink: 0,
                        }}
                      >
                        {e.first_name[0].toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                          {e.first_name} {e.last_name}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: "text.secondary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {e.email}
                          {e.department ? ` · ${e.department}` : ""}
                        </Typography>
                      </Box>
                    </Box>
                  </ResultRow>
                ))}
              </Box>
            )}

            {results.courses.length > 0 && (
              <Box component="section">
                <GroupHeader
                  icon={BookOpen}
                  label="Cursos del paquete"
                  count={results.courses.length}
                />
                {results.courses.map((c) => (
                  <ResultRow
                    key={c.wp_course_id}
                    href={companyPath(companySlug, "/progress")}
                    onClose={onClose}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "6px",
                          bgcolor: "rgba(53,121,245,0.1)",
                          flexShrink: 0,
                        }}
                      >
                        <BookOpen size={11} strokeWidth={2} style={{ color: "var(--portal-blue)" }} />
                      </Avatar>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                        {c.course_name}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "10px",
                        fontFamily: "monospace",
                        color: "text.disabled",
                        flexShrink: 0,
                      }}
                    >
                      ID {c.wp_course_id}
                    </Typography>
                  </ResultRow>
                ))}
              </Box>
            )}
          </Box>
        )
      }}
    />
  )
}

function GroupHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: ElementType
  label: string
  count: number
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.875, px: 2, pt: 1.5, pb: 0.75 }}>
      <Icon size={11} strokeWidth={2.5} style={{ color: "#858382", flexShrink: 0 }} />
      <Typography
        sx={{
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "text.secondary",
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: "10px", color: "text.disabled", lineHeight: 1 }}>
        ({count})
      </Typography>
    </Box>
  )
}

function ResultRow({
  href,
  onClose,
  children,
}: {
  href: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <Box
      component={Link}
      href={href}
      data-palette-item=""
      tabIndex={0}
      onClick={onClose}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: 2,
        py: 1.25,
        textDecoration: "none",
        color: "inherit",
        transition: "background-color 0.12s ease",
        "&:hover": { bgcolor: "action.hover" },
        "&:focus": { bgcolor: "action.hover", outline: "none" },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: "-2px",
        },
      }}
    >
      {children}
    </Box>
  )
}
