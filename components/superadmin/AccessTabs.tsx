"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Pagination } from "@/components/shared/Pagination"
import { getInitials } from "@/components/layout/nav-config"
import {
  deleteEmployeeAsSuperAdminAction,
  toggleHrUserStatusAction,
} from "@/app/(portal)/superadmin/access/actions"

export type HrAccessRow = {
  id: string
  name: string
  email: string
  active: boolean
  companyName: string
  lastAccess: string
  createdAt: string
  usedSeats: number | null
  contractedSeats: number | null
}

export type EmployeeAccessRow = {
  id: string
  name: string
  lastName: string
  email: string
  active: boolean
  companyName: string
  wpUserId: number | null
  createdAt: string
  portalActive: boolean | null
  portalLastAccess: string
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

function RowIdentity({
  name,
  email,
  avatarLabel,
}: {
  name: string
  email: string
  avatarLabel: string
}) {
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
        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{name}</Typography>
        <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.25 }}>{email}</Typography>
      </Box>
    </Stack>
  )
}

function SeatsRing({ used, total }: { used: number | null; total: number | null }) {
  if (!total || total <= 0) {
    return <Typography sx={{ fontSize: 12, color: "text.secondary" }}>—</Typography>
  }
  const pct = Math.min(100, Math.round(((used ?? 0) / total) * 100))
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
        {used}/{total}
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
      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{description}</Typography>
    </Box>
  )
}

function EmptyState({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: "center", py: 8, textAlign: "center" }}>
      <Avatar sx={{ width: 48, height: 48, bgcolor: "action.hover", color: "text.disabled" }}>
        <Icon size={20} />
      </Avatar>
      <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{label}</Typography>
    </Stack>
  )
}

type EmployeePagination = {
  currentPage: number
  totalPages: number
  totalResults: number
}

type AccessTabsProps = {
  hrUsers: HrAccessRow[]
  employees: EmployeeAccessRow[]
  defaultTab?: "hr" | "employees"
  employeeSearch: string
  employeesGrandTotal: number
  employeePagination: EmployeePagination
}

export function AccessTabs({
  hrUsers,
  employees,
  defaultTab = "hr",
  employeeSearch,
  employeesGrandTotal,
  employeePagination,
}: AccessTabsProps) {
  const router = useRouter()
  const [tab, setTab] = useState<"hr" | "employees">(defaultTab)
  const [hrSearch, setHrSearch] = useState("")

  function handleTabChange(value: "hr" | "employees") {
    setTab(value)
    router.replace(
      value === "employees" ? "/superadmin/access?tab=employees" : "/superadmin/access",
      { scroll: false },
    )
  }

  function buildEmployeePageUrl(page: number) {
    const qs = new URLSearchParams()
    qs.set("tab", "employees")
    if (employeeSearch) qs.set("q", employeeSearch)
    if (page > 1) qs.set("page", String(page))
    return `/superadmin/access?${qs.toString()}`
  }

  const filteredHr = hrSearch.trim()
    ? hrUsers.filter((u) => {
        const q = hrSearch.toLowerCase()
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.companyName.toLowerCase().includes(q)
        )
      })
    : hrUsers

  return (
    <Paper elevation={0} sx={{ borderRadius: "8px", backgroundColor: "#FFFFFF" }}>
      <Tabs
        value={tab}
        onChange={(_, value: "hr" | "employees") => handleTabChange(value)}
        sx={{ px: 2.5, pt: 1, borderBottom: "1px solid var(--portal-border)" }}
      >
        <Tab value="hr" label={`Usuarios HR (${hrUsers.length})`} />
        <Tab value="employees" label={`Empleados (${employeesGrandTotal})`} />
      </Tabs>

      {tab === "hr" && (
        <Stack spacing={2} sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <SectionHeader
              title="Usuarios HR por empresa"
              description="Pausa o reactiva accesos sin necesidad de eliminar la cuenta."
            />
            <SearchInput
              value={hrSearch}
              onChange={setHrSearch}
              placeholder="Buscar por nombre, email o empresa…"
              width={280}
            />
          </Box>
          {hrUsers.length === 0 ? (
            <EmptyState icon={Users} label="Aún no hay usuarios HR registrados." />
          ) : filteredHr.length === 0 ? (
            <EmptyState icon={Users} label={`Sin resultados para "${hrSearch}".`} />
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
                {filteredHr.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={cellSx}>
                      <RowIdentity name={user.name} email={user.email} avatarLabel={user.name} />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 13 }}>{user.companyName}</Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <StatusBadge
                        active={user.active}
                        activeLabel="Activo"
                        inactiveLabel="Suspendido"
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {user.lastAccess}
                      </Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <SeatsRing used={user.usedSeats} total={user.contractedSeats} />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {user.createdAt}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "right" }}>
                      <ConfirmIconButton
                        showLabel
                        tone={user.active ? "outline" : "brand"}
                        icon={user.active ? <Pause size={13} /> : <Play size={13} />}
                        label={user.active ? "Suspender" : "Reactivar"}
                        title={
                          user.active ? `¿Suspender a ${user.name}?` : `¿Reactivar a ${user.name}?`
                        }
                        description={
                          user.active
                            ? "El usuario perderá acceso al portal de inmediato."
                            : "El usuario recuperará acceso al portal de inmediato."
                        }
                        confirmLabel={user.active ? "Sí, suspender" : "Sí, reactivar"}
                        action={toggleHrUserStatusAction}
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

      {tab === "employees" && (
        <Stack spacing={2} sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <SectionHeader
              title="Empleados del portal"
              description="Elimina accesos cuando sea necesario liberar una cuenta."
            />
            <Box
              component="form"
              method="GET"
              action="/superadmin/access"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <input type="hidden" name="tab" value="employees" />
              <SearchInput
                name="q"
                defaultValue={employeeSearch}
                placeholder="Buscar por nombre, email o empresa…"
                width={280}
              />
            </Box>
          </Box>
          {employeePagination.totalResults === 0 && !employeeSearch ? (
            <EmptyState icon={UserX} label="Aún no hay empleados registrados." />
          ) : employees.length === 0 ? (
            <EmptyState icon={UserX} label={`Sin resultados para "${employeeSearch}".`} />
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
                {employees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell sx={cellSx}>
                      <RowIdentity
                        name={`${employee.name} ${employee.lastName}`}
                        email={employee.email}
                        avatarLabel={`${employee.name} ${employee.lastName}`}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 13 }}>{employee.companyName}</Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <StatusBadge
                        active={employee.active}
                        activeLabel="Activo"
                        inactiveLabel="Suspendido"
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      {employee.portalActive === null ? (
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                          Sin cuenta
                        </Typography>
                      ) : (
                        <StatusBadge
                          active={employee.portalActive}
                          activeLabel="Activo"
                          inactiveLabel="Suspendido"
                        />
                      )}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary", fontFamily: "monospace" }}
                      >
                        {employee.wpUserId ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {employee.portalLastAccess}
                      </Typography>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {employee.createdAt}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "right" }}>
                      <ConfirmIconButton
                        showLabel
                        tone="outline-destructive"
                        icon={<Trash2 size={13} />}
                        label="Eliminar"
                        title={`¿Eliminar a ${employee.name} ${employee.lastName}?`}
                        description="Esta acción eliminará al empleado del portal y también intentará remover su usuario en WordPress/Tutor LMS."
                        confirmLabel="Sí, eliminar"
                        action={deleteEmployeeAsSuperAdminAction}
                        hiddenFields={{ empleado_id: employee.id }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      )}
      {tab === "employees" && employees.length > 0 && (
        <Pagination
          currentPage={employeePagination.currentPage}
          totalPages={employeePagination.totalPages}
          totalResults={employeePagination.totalResults}
          buildPageUrl={buildEmployeePageUrl}
        />
      )}
    </Paper>
  )
}
