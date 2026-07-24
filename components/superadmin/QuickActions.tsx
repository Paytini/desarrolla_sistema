"use client"

import Link from "next/link"
import { alpha } from "@mui/material/styles"
import { Avatar, Box, Typography } from "@mui/material"
import { BarChart3, Building2, FileText, Package, Share2, Users, type LucideIcon } from "lucide-react"
import { SectionCard } from "@/components/shared/SectionCard"

const ACTIONS: { label: string; description: string; href: string; Icon: LucideIcon }[] = [
  { label: "Empresas",    description: "Clientes y cupos",    href: "/superadmin/companies",    Icon: Building2 },
  { label: "Paquetes",    description: "Planes y cursos",     href: "/superadmin/packages",    Icon: Package },
  { label: "Reportes",    description: "Analíticas globales", href: "/superadmin/reports",    Icon: BarChart3 },
  { label: "Editor DC-3", description: "Metadatos STPS",     href: "/superadmin/dc3",         Icon: FileText },
  { label: "Accesos",     description: "Usuarios del portal", href: "/superadmin/access",     Icon: Users },
  { label: "Bridge WP",   description: "Estado del bridge",  href: "/superadmin/integration", Icon: Share2 },
]

export function QuickActions() {
  return (
    <SectionCard title="Accesos directos">
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
        {ACTIONS.map(({ label, description, href, Icon }) => (
          <Box
            key={href}
            component={Link}
            href={href}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              borderRadius: 0,
              border: "1px solid",
              borderColor: "divider",
              p: 1.5,
              textDecoration: "none",
              transition: "background-color 0.15s, border-color 0.15s",
              "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
              }}
            >
              <Icon size={14} strokeWidth={2} />
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, color: "text.primary" }}>
                {label}
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: 10, lineHeight: 1.3, color: "text.secondary" }}>
                {description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </SectionCard>
  )
}
