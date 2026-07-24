import { Box, Chip, Stack, Typography } from "@mui/material"
import { formatDateTime } from "@/lib/format"
import { SectionCard } from "@/components/shared/SectionCard"

export type ActivityItem = {
  id: number
  actor_name: string
  actor_role: string
  action: string
  entity_type: string
  summary: string
  created_at: Date
}

const ACTION_META: Record<
  string,
  { label: string; dotColor: string; bgColor: string; textColor: string }
> = {
  EMPRESA_CREADA:      { label: "Alta",       dotColor: "#16a34a", bgColor: "#f0fdf4", textColor: "#15803d" },
  EMPRESA_SUSPENDIDA:  { label: "Suspensión", dotColor: "#dc2626", bgColor: "#fef2f2", textColor: "#dc2626" },
  EMPRESA_ACTIVADA:    { label: "Activación", dotColor: "#16a34a", bgColor: "#f0fdf4", textColor: "#15803d" },
  PAQUETE_ASIGNADO:    { label: "Paquete",    dotColor: "#1a4f8a", bgColor: "#eff4fb", textColor: "#1a4f8a" },
  CUPOS_ACTUALIZADOS:  { label: "Cupos",      dotColor: "#1a4f8a", bgColor: "#eff4fb", textColor: "#1a4f8a" },
  EMPLEADO_CREADO:     { label: "Empleado",   dotColor: "#7c3aed", bgColor: "#f5f3ff", textColor: "#7c3aed" },
  EMPLEADO_SUSPENDIDO: { label: "Baja",       dotColor: "#b45309", bgColor: "#fffbeb", textColor: "#b45309" },
}

const DEFAULT_META = { label: "Evento", dotColor: "#94a3b8", bgColor: "#f8fafc", textColor: "#64748b" }

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <SectionCard title="Actividad reciente" disableContentPadding>
      <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
        {items.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Sin eventos registrados aún.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ position: "relative", px: 2.5, py: 2 }}>
            <Box sx={{ position: "absolute", left: 28, top: 16, bottom: 16, width: "1px", bgcolor: "#f1f5f9" }} />
            <Stack spacing={0}>
              {items.map((item) => {
                const meta = ACTION_META[item.action] ?? DEFAULT_META
                return (
                  <Stack
                    key={item.id}
                    direction="row"
                    spacing={2}
                    sx={{ position: "relative", alignItems: "flex-start", py: 1.25 }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        zIndex: 1,
                        mt: 0.25,
                        width: 18,
                        height: 18,
                        flexShrink: 0,
                        borderRadius: "50%",
                        bgcolor: "#fff",
                        border: `2px solid ${meta.dotColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: meta.dotColor }} />
                    </Box>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ minWidth: 0, flex: 1, flexWrap: "wrap", alignItems: "center", rowGap: 0.5 }}
                    >
                      <Chip
                        label={meta.label}
                        size="small"
                        sx={{
                          height: 20,
                          borderRadius: "4px",
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          bgcolor: meta.bgColor,
                          color: meta.textColor,
                        }}
                      />
                      <Typography sx={{ fontSize: 13, color: "text.primary" }}>
                        {item.summary}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                        · {item.actor_name}
                      </Typography>
                    </Stack>
                    <Typography
                      sx={{
                        flexShrink: 0,
                        fontFamily: "monospace",
                        fontSize: 10.5,
                        fontVariantNumeric: "tabular-nums",
                        color: "text.secondary",
                      }}
                    >
                      {formatDateTime(item.created_at)}
                    </Typography>
                  </Stack>
                )
              })}
            </Stack>
          </Box>
        )}
      </Box>
    </SectionCard>
  )
}
