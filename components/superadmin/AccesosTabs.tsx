"use client"

import { useState } from "react"
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import { Pause, Play, Trash2, Users, UserX, type LucideIcon } from "lucide-react"
import { ConfirmIconButton } from "@/components/shared/ConfirmIconButton"
import { SearchInput } from "@/components/shared/SearchInput"
import { getInitials } from "@/components/layout/nav-config"
import { deleteEmployeeAsSuperAdminAction, toggleRhUserStatusAction } from "@/app/(portal)/superadmin/accesos/actions"

// NOTA (MUI v9.1.1 en este proyecto): `fontSize`, `fontWeight`, `fontFamily` y `color` no son
// props directos válidos de `Typography`, y `alignItems` no es prop directo válido de `Stack`.
// Deben pasarse vía `sx={{ ... }}`. Este es el patrón a seguir en toda la migración a MUI,
// no algo específico de esta página — no "simplificar" a props directos en futuras páginas.

export type RhAccessRow = {
  id: number
  nombre: string
  email: string
  activo: boolean
  empresaNombre: string
  ultimoAcceso: string
  altaFecha: string
  cuposUsados: number | null
  cuposContratados: number | null
}

export type EmployeeAccessRow = {
  id: number
  nombre: string
  apellido: string
  email: string
  activo: boolean
  empresaNombre: string
  wpUserId: number | null
  altaFecha: string
  portalActivo: boolean | null
  portalUltimoAcceso: string
}

const headerCellSx = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "text.secondary",
  borderBottom: "none",
} as const

const cellSx = { px: 1.5, py: 2 } as const

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean
  activeLabel: string
  inactiveLabel: string
}) {
  return (
    <Chip
      label={active ? activeLabel : inactiveLabel}
      size="small"
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 600,
        bgcolor: active ? "#D1FAE5" : "#E2E8F0",
        color: active ? "#047857" : "#475569",
      }}
    />
  )
}

function RowIdentity({ name, email, avatarLabel }: { name: string; email: string; avatarLabel: string }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Avatar
        sx={{
          width: 36,
          height: 36,
          fontSize: 12,
          fontWeight: 700,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
          color: "primary.main",
        }}
      >
        {getInitials(avatarLabel)}
      </Avatar>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
          {name}
        </Typography>
        <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.25 }}>
          {email}
        </Typography>
      </Box>
    </Stack>
  )
}

function CuposRing({ usados, contratados }: { usados: number | null; contratados: number | null }) {
  if (!contratados || contratados <= 0) {
    return (
      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
        —
      </Typography>
    )
  }
  const pct = Math.min(100, Math.round(((usados ?? 0) / contratados) * 100))
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Box sx={{ position: "relative", width: 32, height: 32 }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={32}
          thickness={4}
          sx={{ position: "absolute", color: "#EFEAE3" }}
        />
        <CircularProgress
          variant="determinate"
          value={pct}
          size={32}
          thickness={4}
          sx={{ position: "absolute", color: "primary.main" }}
        />
      </Box>
      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
        {usados}/{contratados}
      </Typography>
    </Stack>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <Box>
      <Typography variant="h2" sx={{ fontSize: 16, fontWeight: 600 }}>
        {title}
      </Typography>
      <Box sx={{ mt: 1.5, mb: 1, height: 2, width: 24, bgcolor: "primary.main" }} />
      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
        {description}
      </Typography>
    </Box>
  )
}

function EmptyState({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: "center", py: 8, textAlign: "center" }}>
      <Avatar sx={{ width: 48, height: 48, bgcolor: "action.hover", color: "text.disabled" }}>
        <Icon size={20} />
      </Avatar>
      <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
        {label}
      </Typography>
    </Stack>
  )
}

type AccesosTabsProps = {
  rhUsers: RhAccessRow[]
  employees: EmployeeAccessRow[]
}

export function AccesosTabs({ rhUsers, employees }: AccesosTabsProps) {
  const [tab, setTab]         = useState<"rh" | "empleados">("rh")
  const [rhSearch, setRhSearch]   = useState("")
  const [empSearch, setEmpSearch] = useState("")

  const filteredRh = rhSearch.trim()
    ? rhUsers.filter((u) => {
        const q = rhSearch.toLowerCase()
        return (
          u.nombre.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.empresaNombre.toLowerCase().includes(q)
        )
      })
    : rhUsers

  const filteredEmp = empSearch.trim()
    ? employees.filter((e) => {
        const q = empSearch.toLowerCase()
        return (
          e.nombre.toLowerCase().includes(q) ||
          e.apellido.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.empresaNombre.toLowerCase().includes(q)
        )
      })
    : employees

  return (
    <Paper elevation={0} sx={{ borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
      <Tabs value={tab} onChange={(_, value: "rh" | "empleados") => setTab(value)} sx={{ px: 2.5, pt: 1, borderBottom: '1px solid #E5E7EB' }}>
        <Tab value="rh" label={`Usuarios RH (${rhUsers.length})`} />
        <Tab value="empleados" label={`Empleados (${employees.length})`} />
      </Tabs>

      {tab === "rh" && (
        <Stack spacing={2} sx={{ p: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <SectionHeader
              title="Usuarios RH por empresa"
              description="Pausa o reactiva accesos sin necesidad de eliminar la cuenta."
            />
            <SearchInput
              value={rhSearch}
              onChange={setRhSearch}
              placeholder="Buscar por nombre, email o empresa…"
              width={280}
            />
          </Box>
          {rhUsers.length === 0 ? (
            <EmptyState icon={Users} label="Aún no hay usuarios RH registrados." />
          ) : filteredRh.length === 0 ? (
            <EmptyState icon={Users} label={`Sin resultados para "${rhSearch}".`} />
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={headerCellSx}>Nombre</TableCell>
                  <TableCell sx={headerCellSx}>Empresa</TableCell>
                  <TableCell sx={headerCellSx}>Estado</TableCell>
                  <TableCell sx={headerCellSx}>Último acceso</TableCell>
                  <TableCell sx={headerCellSx}>Cupos</TableCell>
                  <TableCell sx={headerCellSx}>Alta</TableCell>
                  <TableCell sx={{ ...headerCellSx, textAlign: "right" }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRh.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={cellSx}>
                      <RowIdentity name={user.nombre} email={user.email} avatarLabel={user.nombre} />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 13 }}>{user.empresaNombre}</Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <StatusBadge active={user.activo} activeLabel="Activo" inactiveLabel="Suspendido" />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {user.ultimoAcceso}
                      </Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <CuposRing usados={user.cuposUsados} contratados={user.cuposContratados} />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {user.altaFecha}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "right" }}>
                      <ConfirmIconButton
                        showLabel
                        tone={user.activo ? "outline" : "brand"}
                        icon={user.activo ? <Pause size={13} /> : <Play size={13} />}
                        label={user.activo ? "Suspender" : "Reactivar"}
                        title={user.activo ? `¿Suspender a ${user.nombre}?` : `¿Reactivar a ${user.nombre}?`}
                        description={
                          user.activo
                            ? "El usuario perderá acceso al portal de inmediato."
                            : "El usuario recuperará acceso al portal de inmediato."
                        }
                        confirmLabel={user.activo ? "Sí, suspender" : "Sí, reactivar"}
                        action={toggleRhUserStatusAction}
                        hiddenFields={{ user_id: user.id }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      )}

      {tab === "empleados" && (
        <Stack spacing={2} sx={{ p: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <SectionHeader
              title="Empleados del portal"
              description="Elimina accesos cuando sea necesario liberar una cuenta."
            />
            <SearchInput
              value={empSearch}
              onChange={setEmpSearch}
              placeholder="Buscar por nombre, email o empresa…"
              width={280}
            />
          </Box>
          {employees.length === 0 ? (
            <EmptyState icon={UserX} label="Aún no hay empleados registrados." />
          ) : filteredEmp.length === 0 ? (
            <EmptyState icon={UserX} label={`Sin resultados para "${empSearch}".`} />
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={headerCellSx}>Empleado</TableCell>
                  <TableCell sx={headerCellSx}>Empresa</TableCell>
                  <TableCell sx={headerCellSx}>Estado</TableCell>
                  <TableCell sx={headerCellSx}>Portal</TableCell>
                  <TableCell sx={headerCellSx}>WP ID</TableCell>
                  <TableCell sx={headerCellSx}>Último acceso</TableCell>
                  <TableCell sx={headerCellSx}>Alta</TableCell>
                  <TableCell sx={{ ...headerCellSx, textAlign: "right" }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmp.map((emp) => (
                  <TableRow key={emp.id} hover>
                    <TableCell sx={cellSx}>
                      <RowIdentity
                        name={`${emp.nombre} ${emp.apellido}`}
                        email={emp.email}
                        avatarLabel={`${emp.nombre} ${emp.apellido}`}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 13 }}>{emp.empresaNombre}</Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <StatusBadge active={emp.activo} activeLabel="Activo" inactiveLabel="Suspendido" />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      {emp.portalActivo === null ? (
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                          Sin cuenta
                        </Typography>
                      ) : (
                        <StatusBadge active={emp.portalActivo} activeLabel="Activo" inactiveLabel="Suspendido" />
                      )}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary", fontFamily: "monospace" }}>
                        {emp.wpUserId ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {emp.portalUltimoAcceso}
                      </Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {emp.altaFecha}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "right" }}>
                      <ConfirmIconButton
                        showLabel
                        tone="outline-destructive"
                        icon={<Trash2 size={13} />}
                        label="Eliminar"
                        title={`¿Eliminar a ${emp.nombre} ${emp.apellido}?`}
                        description="Esta acción eliminará al empleado del portal y también intentará remover su usuario en WordPress/Tutor LMS."
                        confirmLabel="Sí, eliminar"
                        action={deleteEmployeeAsSuperAdminAction}
                        hiddenFields={{ empleado_id: emp.id }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      )}
    </Paper>
  )
}
