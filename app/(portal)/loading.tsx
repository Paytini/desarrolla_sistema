import LoadingOverlay from "@/components/portal/LoadingOverlay"

export default function PortalLoading() {
  return (
    <LoadingOverlay
      message="Cargando pagina..."
      detail="Estamos preparando la siguiente vista del portal."
    />
  )
}
