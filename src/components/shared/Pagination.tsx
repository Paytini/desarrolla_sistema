import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { slate } from "@/lib/theme-tokens"

const NAV_LINK_SX = {
  display: "inline-flex",
  alignItems: "center",
  height: 28,
  paddingLeft: 10,
  paddingRight: 10,
  fontSize: 12,
  fontWeight: 500,
  color: slate[900],
  textDecoration: "none",
  border: `1px solid ${slate[200]}`,
} as const

function getPageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  const pages: Array<number | "ellipsis"> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push("ellipsis")
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total - 1) pages.push("ellipsis")
  if (total > 1) pages.push(total)

  return pages
}

type PaginationProps = {
  currentPage: number
  totalPages: number
  totalResults: number
  buildPageUrl: (page: number) => string
  variant?: "simple" | "numbered"
}

export function Pagination({
  currentPage,
  totalPages,
  totalResults,
  buildPageUrl,
  variant = "simple",
}: PaginationProps) {
  if (totalPages <= 1) return null

  if (variant === "numbered") {
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
          {totalResults} resultado{totalResults !== 1 ? "s" : ""}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <PageArrowButton
            direction="prev"
            href={currentPage > 1 ? buildPageUrl(currentPage - 1) : undefined}
          />
          {getPageNumbers(currentPage, totalPages).map((page, index) =>
            page === "ellipsis" ? (
              <Typography
                key={`ellipsis-${index}`}
                sx={{ px: 0.5, fontSize: 12, color: "text.disabled" }}
              >
                …
              </Typography>
            ) : (
              <PageNumberButton
                key={page}
                page={page}
                active={page === currentPage}
                href={buildPageUrl(page)}
              />
            ),
          )}
          <PageArrowButton
            direction="next"
            href={currentPage < totalPages ? buildPageUrl(currentPage + 1) : undefined}
          />
        </Box>
      </Box>
    )
  }

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

function PageNumberButton({
  page,
  active,
  href,
}: {
  page: number
  active: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: "50%",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        textDecoration: "none",
        color: active ? "#fff" : slate[600],
        backgroundColor: active ? "var(--portal-blue)" : "transparent",
      }}
    >
      {page}
    </Link>
  )
}

function PageArrowButton({ direction, href }: { direction: "prev" | "next"; href?: string }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight
  const style = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: `1px solid ${slate[200]}`,
    color: slate[500],
  } as const

  if (!href) {
    return (
      <Box component="span" sx={{ ...style, opacity: 0.4 }}>
        <Icon size={14} />
      </Box>
    )
  }

  return (
    <Link href={href} style={{ ...style, textDecoration: "none" }}>
      <Icon size={14} />
    </Link>
  )
}
