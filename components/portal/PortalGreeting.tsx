"use client"

const roleSubtitle: Record<string, string> = {
  SUPERADMIN: "Gestiona y monitorea tu plataforma de capacitación.",
  RH:         "Administra la capacitación de tu equipo.",
  EMPLEADO:   "Revisa tu avance y descarga tus constancias.",
}

export function PortalGreeting({ nombre, rol }: { nombre: string; rol: string }) {
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"
  const firstName = nombre.split(" ")[0] ?? nombre
  const subtitle  = roleSubtitle[rol] ?? "Bienvenido al portal."

  return (
    <div className="min-w-0">
      <h2 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">
        {greeting}, {firstName}
      </h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
    </div>
  )
}
