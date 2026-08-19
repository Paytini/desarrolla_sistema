import { redirect } from "next/navigation"
import { auth } from "@/auth"

export default async function Home() {
  const session = await auth()
  const rol = session?.user?.rol
  const empresaSlug = session?.user?.empresa_slug

  if      (rol === "SUPERADMIN") redirect("/superadmin/companies")
  else if (rol === "RH" && empresaSlug) redirect(`/company/${empresaSlug}/home`)
  else if (rol === "EMPLEADO")   redirect("/employee/courses")
  else if (rol)                  redirect("/login?error=rol_no_reconocido")
  else                           redirect("/login")
}
