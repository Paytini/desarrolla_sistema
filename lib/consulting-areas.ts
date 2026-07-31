import {
  Award,
  BadgeCheck,
  Building2,
  Compass,
  Flame,
  GraduationCap,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { KpiColorKey } from "@/lib/kpi-colors"

export type ConsultingAreaId =
  | "CTPAT"
  | "OEA"
  | "FIRE_SAFETY"
  | "HUMAN_RESOURCES"
  | "EC0217"
  | "EC0634"
  | "EC0306"
  | "EC0397_01"

export type ConsultingAreaOption = {
  id: ConsultingAreaId
  label: string
  description: string
  icon: LucideIcon
  color: KpiColorKey
}

export const CONSULTING_AREAS: ConsultingAreaOption[] = [
  {
    id: "CTPAT",
    label: "CTPAT",
    description: "Seguridad en la cadena de suministro.",
    icon: ShieldCheck,
    color: "rose",
  },
  {
    id: "OEA",
    label: "OEA",
    description: "Operador Económico Autorizado.",
    icon: Building2,
    color: "primary",
  },
  {
    id: "FIRE_SAFETY",
    label: "Sistemas Contra Incendios",
    description: "Soluciones completas contra incendios.",
    icon: Flame,
    color: "orange",
  },
  {
    id: "HUMAN_RESOURCES",
    label: "Recursos Humanos",
    description: "Gestión y desarrollo del talento.",
    icon: Users,
    color: "violet",
  },
  {
    id: "EC0217",
    label: "EC0217",
    description: "Impartición de cursos de formación del capital humano de manera presencial grupal.",
    icon: GraduationCap,
    color: "emerald",
  },
  {
    id: "EC0634",
    label: "EC0634",
    description: "Auditoría de la seguridad en la cadena de suministro de comercio exterior.",
    icon: Award,
    color: "amber",
  },
  {
    id: "EC0306",
    label: "EC0306",
    description: "Reclutamiento y Selección de Personal Operativo y Administración.",
    icon: BadgeCheck,
    color: "charcoal",
  },
  {
    id: "EC0397_01",
    label: "EC0397.01",
    description: "Vigilancia del cumplimiento de la normatividad en seguridad y salud en el trabajo.",
    icon: Compass,
    color: "pink",
  },
]

export function getConsultingArea(id: string): ConsultingAreaOption | undefined {
  return CONSULTING_AREAS.find((area) => area.id === id)
}
