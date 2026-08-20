import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import Link from "next/link"

const NAV_LINK_SX = {
  display: "inline-flex",
  alignItems: "center",
  height: 28,
  paddingLeft: 10,
  paddingRight: 10,
  fontSize: 12,
  fontWeight: 500,
  color: "#0f172a",
  textDecoration: "none",
  border: "1px solid #e2e8f0",
} as const

export function Pagination({
  currentPage,
  totalPages,
  totalResults,
  buildPageUrl,
}: {
  currentPage: number
  totalPages: number
  totalResults: number
  buildPageUrl: (page: number) => string
}) {
  if (totalPages <= 1) return null

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: "1px solid",
        borderColor: "divider",
        px: 2.5,
        py: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
        {totalResults} resultado{totalResults !== 1 ? "s" : ""} · página {currentPage} de{" "}
        {totalPages}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        {currentPage > 1 ? (
          <Link href={buildPageUrl(currentPage - 1)} style={NAV_LINK_SX}>
            ← Anterior
          </Link>
        ) : (
          <Button variant="outlined" size="small" disabled sx={{ height: 28, fontSize: 12 }}>
            ← Anterior
          </Button>
        )}
        {currentPage < totalPages ? (
          <Link href={buildPageUrl(currentPage + 1)} style={NAV_LINK_SX}>
            Siguiente →
          </Link>
        ) : (
          <Button variant="outlined" size="small" disabled sx={{ height: 28, fontSize: 12 }}>
            Siguiente →
          </Button>
        )}
      </Box>
    </Box>
  )
}
