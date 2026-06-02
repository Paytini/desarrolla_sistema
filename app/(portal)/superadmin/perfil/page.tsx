import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { AlertCircle, CheckCircle2, KeyRound, Mail, ShieldCheck, UserCircle } from "lucide-react"
import { redirect } from "next/navigation"
import { changePasswordAction } from "./actions"

const successMessages: Record<string, string> = {
  password_changed: "Contraseña actualizada correctamente.",
}
const errorMessages: Record<string, string> = {
  missing_fields: "Todos los campos son obligatorios.",
  password_mismatch: "Las contraseñas nuevas no coinciden.",
  password_too_short: "La nueva contraseña debe tener al menos 8 caracteres.",
  wrong_password: "La contraseña actual es incorrecta.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function PerfilPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(session.user.id) },
    select: { nombre: true, email: true, rol: true, ultimo_acceso: true, created_at: true },
  })
  if (!usuario) redirect("/login")

  const initials = usuario.nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  const infoRows = [
    { icon: Mail, label: "Correo electrónico", value: usuario.email },
    { icon: ShieldCheck, label: "Rol", value: "SuperAdmin" },
    { icon: UserCircle, label: "Cuenta creada", value: formatDateTime(usuario.created_at) },
    ...(usuario.ultimo_acceso ? [{ icon: KeyRound, label: "Último acceso", value: formatDateTime(usuario.ultimo_acceso) }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SuperAdmin</p>
        <h1 className="text-2xl font-bold text-slate-950">Mi perfil</h1>
        <p className="mt-0.5 text-sm text-slate-500">Información de tu cuenta y configuración de seguridad.</p>
      </div>

      {/* Hero banner */}
      <div className="flex items-center gap-5 rounded-xl bg-[#F5853F] px-8 py-6">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border-2 border-white/30 bg-white/20 text-2xl font-bold text-white">
          {initials}
        </div>
        <div>
          <p className="text-xl font-bold text-white">{usuario.nombre}</p>
          <p className="text-sm text-white/75">{usuario.email}</p>
          <Badge className="mt-2 border-white/30 bg-white/20 text-white hover:bg-white/20">SUPERADMIN</Badge>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="size-4" />
          <AlertDescription>{successMessages[success] ?? success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMessages[error] ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Identity card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col items-center gap-3 pb-2">
              <div className="flex size-20 items-center justify-center rounded-full bg-[#F5853F] text-2xl font-bold text-white">
                {initials}
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-950">{usuario.nombre}</p>
                <Badge className="mt-1 bg-[#fff2eb] text-[#D96B20] hover:bg-[#fff2eb]">SuperAdmin</Badge>
              </div>
            </div>
            <Separator />
          </CardHeader>
          <CardContent className="p-0">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 last:border-0">
                <Icon size={14} className="shrink-0 text-slate-400" strokeWidth={2} />
                <div>
                  <p className="text-[11px] font-medium text-slate-400">{label}</p>
                  <p className="text-sm font-medium text-slate-900">{value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Cambiar contraseña</CardTitle>
            <CardDescription>Usa una contraseña segura de al menos 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={changePasswordAction} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="current_password" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Contraseña actual
                </Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new_password" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Nueva contraseña
                </Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mín. 8 caracteres"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="confirm_password" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Confirmar nueva contraseña
                </Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                />
              </div>
              <div className="pt-2">
                <Button type="submit" className="gap-2 bg-[#F5853F] hover:bg-[#D96B20]">
                  <KeyRound size={14} strokeWidth={2} />
                  Actualizar contraseña
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
