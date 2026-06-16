"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import TableCell from "@mui/material/TableCell"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"

import { getInitials } from "@/components/layout/nav-config"
import { SeatDonut } from "@/components/superadmin/SeatDonut"
import { SuspendCompanyButton } from "@/components/superadmin/SuspendCompanyButton"
import type { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"

type Empresa = Awaited<ReturnType<typeof getSuperadminEmpresasSnapshot>>["empresas"][number]

export function EmpresaRow({ empresa }: { empresa: Empresa }) {
  const paquete = empresa.paquetes[0]?.paquete?.nombre ?? "—"
  const activos = empresa.empleados.filter((e) => e.activo).length

  return (
    <TableRow
      sx={{
        "&:hover": { bgcolor: "action.hover" },
        "&:last-child td": { borderBottom: 0 },
      }}
    >
      {/* Nombre / correo */}
      <TableCell sx={{ py: 1.5, px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 36,
              height: 36,
              fontSize: 12,
              fontWeight: 700,
              borderRadius: "8px",
              bgcolor: "rgba(245,133,63,0.12)",
              color: "#F5853F",
              flexShrink: 0,
            }}
          >
            {getInitials(empresa.nombre)}
          </Avatar>
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

      {/* RFC */}
      <TableCell sx={{ py: 1.5, px: 2, display: { xs: "none", sm: "table-cell" } }}>
        <Typography sx={{ fontFamily: "monospace", fontSize: 12, color: "text.secondary" }}>
          {empresa.rfc ?? "—"}
        </Typography>
      </TableCell>

      {/* Paquete */}
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

      {/* Cupos */}
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

      {/* Alta */}
      <TableCell sx={{ py: 1.5, px: 2, display: { xs: "none", lg: "table-cell" } }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
          {formatDate(empresa.created_at)}
        </Typography>
      </TableCell>

      {/* Estado */}
      <TableCell sx={{ py: 1.5, px: 2 }}>
        <Chip
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: empresa.activo ? "#22c55e" : "#94a3b8",
                }}
              />
              {empresa.activo ? "Activa" : "Suspendida"}
            </Box>
          }
          size="small"
          sx={{
            height: 22,
            fontSize: "11px",
            fontWeight: 600,
            border: "1px solid",
            borderColor: empresa.activo ? "#bbf7d0" : "#e2e8f0",
            bgcolor: empresa.activo ? "#f0fdf4" : "#f8fafc",
            color: empresa.activo ? "#15803d" : "#475569",
            borderRadius: "11px",
            "& .MuiChip-label": { px: 1.25 },
          }}
        />
      </TableCell>

      {/* Acciones */}
      <TableCell sx={{ py: 1.5, px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.75 }}>
          <Button
            component={Link}
            href={`/superadmin/empresas/${empresa.id}`}
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
