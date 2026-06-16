import LoadingOverlay from "@/components/layout/LoadingOverlay"

export default function PortalLoading() {
  return (
    <LoadingOverlay
      message="Cargando pagina..."
      detail="Estamos preparando la siguiente vista del portal."
    />
  )
}
