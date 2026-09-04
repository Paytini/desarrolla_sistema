// Fuente canonica de los colores de marca en JS. Existe por separado de las
// variables CSS de globals.css porque helpers como alpha() de MUI necesitan
// un color real para calcular transparencias -- no aceptan var(--x). Si un
// valor cambia aqui, actualiza tambien la variable correspondiente en
// globals.css (--portal-blue, --portal-blue-hover, etc.).
export const fd = {
  primary: "#3B82F6",
  secondary: "#10B981",
  accent: "#F59E0B",
  muted: "#F3F4F6",
  border: "#E5E7EB",
  foreground: "#111827",
  background: "#FFFFFF",
} as const

export const portalColors = {
  blue: "#3579F5",
  blueHover: "#2A61D6",
  blueSoft: "#EAF1FE",
  border: "#E5E7EB",
} as const
