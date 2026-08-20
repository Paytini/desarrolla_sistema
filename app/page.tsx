import { redirect } from "next/navigation"
import { auth } from "@/auth"

export default async function Home() {
  const session = await auth()
  const role = session?.user?.role
  const empresaSlug = session?.user?.empresa_slug

  if (role === "SUPERADMIN") redirect("/superadmin/companies")
  else if (role === "HR" && empresaSlug) redirect(`/company/${empresaSlug}/home`)
  else if (role === "EMPLOYEE") redirect("/employee/courses")
  else if (role) redirect("/login?error=role_no_reconocido")
  else redirect("/login")
}
