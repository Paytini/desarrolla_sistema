"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import TableCell from "@mui/material/TableCell"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"

import { SeatDonut } from "@/components/superadmin/SeatDonut"
import { SuspendCompanyButton } from "@/components/superadmin/SuspendCompanyButton"
import type { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"

type Empresa = Awaited<ReturnType<typeof getSuperadminEmpresasSnapshot>>["empresas"][number]

export function CompanyRow({ empresa }: { empresa: Empresa }) {
  const paquete = empresa.paquetes[0]?.paquete?.nombre ?? "—"
  const activos = empresa.empleados.filter((e) => e.activo).length

  return (
    <TableRow
      sx={{
        "&:hover": { bgcolor: "action.hover" },
        "&:last-child td": { borderBottom: 0 },
      }}
    >
      <TableCell sx={{ py: 1.5, px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 500,
                color: "text.primary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {empresa.nombre}
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
              {empresa.email_rh}
            </Typography>
          </Box>
        </Box>
      </TableCell>

      <TableCell sx={{ py: 1.5, px: 2, display: { xs: "none", sm: "table-cell" } }}>
        <Typography sx={{ fontFamily: "monospace", fontSize: 12, color: "text.secondary" }}>
          {empresa.rfc ?? "—"}
        </Typography>
      </TableCell>

      <TableCell sx={{ py: 1.5, px: 2, display: { xs: "none", md: "table-cell" } }}>
        <Chip
          label={paquete}
          size="small"
          sx={{
            height: 20,
            fontSize: "11px",
            bgcolor: "action.hover",
            color: "text.secondary",
            "& .MuiChip-label": { px: 1 },
          }}
        />
      </TableCell>

      <TableCell sx={{ py: 1.5, px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SeatDonut used={activos} total={empresa.asientos_contratados} size={48} />
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.primary" }}>
            {activos}
            <Box component="span" sx={{ color: "text.secondary" }}>
              /{empresa.asientos_contratados}
            </Box>
          </Typography>
        </Box>
      </TableCell>

      <TableCell sx={{ py: 1.5, px: 2, display: { xs: "none", lg: "table-cell" } }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
          {formatDate(empresa.created_at)}
        </Typography>
      </TableCell>

      <TableCell sx={{ py: 1.5, px: 2 }}>
        <Chip
          label={empresa.activo ? "Activa" : "Suspendida"}
          size="small"
          sx={{
            height: 22,
            fontSize: "11px",
            fontWeight: 600,
            border: "1px solid",
            borderColor: empresa.activo ? "rgba(40,199,111,0.3)" : "rgba(234,84,85,0.3)",
            bgcolor: empresa.activo ? "rgba(40,199,111,0.12)" : "rgba(234,84,85,0.12)",
            color: empresa.activo ? "#28C76F" : "#EA5455",
            borderRadius: "11px",
            "& .MuiChip-label": { px: 1.25 },
          }}
        />
      </TableCell>

      <TableCell sx={{ py: 1.5, px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.75 }}>
          <Button
            component={Link}
            href={`/superadmin/companies/${empresa.id}`}
            size="small"
            variant="outlined"
            startIcon={<ExternalLink size={11} strokeWidth={2} />}
            sx={{
              height: 28,
              px: 1.25,
              fontSize: 12,
              color: "text.secondary",
              borderColor: "divider",
              "&:hover": { color: "text.primary", borderColor: "text.secondary" },
            }}
          >
            Ver
          </Button>
          <SuspendCompanyButton
            empresaId={empresa.id}
            activo={empresa.activo}
            nombre={empresa.nombre}
          />
        </Box>
      </TableCell>
    </TableRow>
  )
}
