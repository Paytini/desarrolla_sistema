export const SUPPORT_REASONS = [
  { id: "tecnico", label: "Problema técnico o error en el portal" },
  { id: "curso_constancia", label: "Duda sobre un curso o constancia" },
  { id: "capacitacion", label: "Solicitud de capacitación o consultoría" },
  { id: "facturacion", label: "Facturación o pagos" },
  { id: "cuenta_acceso", label: "Cuenta o acceso" },
  { id: "otro", label: "Otro" },
] as const

export type SupportReasonId = (typeof SUPPORT_REASONS)[number]["id"]

export function getSupportReasonLabel(id: string) {
  return SUPPORT_REASONS.find((reason) => reason.id === id)?.label ?? id
}
