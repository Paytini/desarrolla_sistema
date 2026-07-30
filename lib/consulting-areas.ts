import {
  ClipboardList,
  Flame,
  GraduationCap,
  Package,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { KpiColorKey } from "@/lib/kpi-colors"

export type ConsultingAreaId =
  | "LOGISTICS"
  | "FIRE_SAFETY"
  | "MANUFACTURING"
  | "INDUSTRIAL_SAFETY"
  | "ISO_STANDARDS"
  | "CONOCER_CERT"
  | "HUMAN_RESOURCES"

export type ConsultingAreaOption = {
  id: ConsultingAreaId
  label: string
  description: string
  icon: LucideIcon
  color: KpiColorKey
}

export const CONSULTING_AREAS: ConsultingAreaOption[] = [
  {
    id: "LOGISTICS",
    label: "Logística y Cadena de Suministro",
    description: "Optimización de almacenes, CTPAT y OEA.",
    icon: Package,
    color: "violet",
  },
  {
    id: "FIRE_SAFETY",
    label: "Sistema contra Incendios",
    description: "Primeros auxilios, extintores y residuos peligrosos.",
    icon: Flame,
    color: "rose",
  },
  {
    id: "MANUFACTURING",
    label: "Manufactura y Procesos",
    description: "Eficiencia operativa y gestión de calidad.",
    icon: Settings,
    color: "amber",
  },
  {
    id: "INDUSTRIAL_SAFETY",
    label: "Seguridad Industrial (DC-3)",
    description: "Cumplimiento de normas STPS y seguridad patrimonial.",
    icon: ShieldCheck,
    color: "primary",
  },
  {
    id: "ISO_STANDARDS",
    label: "Normas ISO",
    description: "Espacios confinados, trabajo en alturas, LOTO y más.",
    icon: ClipboardList,
    color: "charcoal",
  },
  {
    id: "CONOCER_CERT",
    label: "Certificaciones CONOCER",
    description: "EC0634, EC0217 y estándares de competencia laboral.",
    icon: GraduationCap,
    color: "orange",
  },
  {
    id: "HUMAN_RESOURCES",
    label: "Recursos Humanos",
    description: "NOM-035, liderazgo, clima organizacional y reclutamiento.",
    icon: Users,
    color: "emerald",
  },
]

export function getConsultingArea(id: string): ConsultingAreaOption | undefined {
  return CONSULTING_AREAS.find((area) => area.id === id)
}
