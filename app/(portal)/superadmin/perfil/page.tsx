import StatusNotice from "@/components/portal/StatusNotice"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { KeyRound, Mail, ShieldCheck, UserCircle } from "lucide-react"
import { redirect } from "next/navigation"
import { changePasswordAction } from "./actions"

const successMessages: Record<string, string> = {
  password_changed: "Contraseña actualizada correctamente.",
}
const errorMessages: Record<string, string> = {
  missing_fields:   "Todos los campos son obligatorios.",
  password_mismatch:"Las contraseñas nuevas no coinciden.",
  password_too_short:"La nueva contraseña debe tener al menos 8 caracteres.",
  wrong_password:   "La contraseña actual es incorrecta.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function PerfilPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const params  = await searchParams
  const success = readSearchParam(params, "success")
  const error   = readSearchParam(params, "error")

  const usuario = await prisma.usuario.findUnique({
    where:  { id: Number(session.user.id) },
    select: { nombre: true, email: true, rol: true, ultimo_acceso: true, created_at: true },
  })
  if (!usuario) redirect("/login")

  const initials = usuario.nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div className="space-y-7">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E8761A]">
          SuperAdmin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Mi perfil</h1>
        <p className="text-sm text-slate-400">Información de tu cuenta y seguridad.</p>
      </header>

      <div
        className="flex items-center gap-6 rounded-xl px-8 py-6"
        style={{ background: "linear-gradient(135deg, #E8761A 0%, #C45F0A 100%)" }}
      >
        <div className="flex size-[72px] shrink-0 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20 text-[26px] font-bold text-white">
          {initials}
        </div>
        <div>
          <p className="text-[22px] font-bold text-white">{usuario.nombre}</p>
          <p className="text-[14px] text-white/80">{usuario.email}</p>
          <span className="mt-2 inline-block rounded-full border border-white/30 bg-white/20 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.8px] text-white">
            {usuario.rol}
          </span>
        </div>
      </div>

      {success ? <StatusNotice tone="success" message={successMessages[success] ?? success} /> : null}
      {error   ? <StatusNotice tone="error"   message={errorMessages[error]   ?? error}   /> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Identity card */}
        <article className="rounded-xl border border-slate-200 bg-white p-7">
          <div className="flex flex-col items-center gap-5">
            {/* Avatar */}
            <div className="flex size-24 items-center justify-center rounded-full bg-[#E8761A] text-3xl font-semibold text-white shadow-md">
              {initials}
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-1 text-center">
                <p className="text-xl font-semibold text-slate-950">{usuario.nombre}</p>
                <span className="inline-flex rounded-full bg-[#fff5ed] px-3 py-1 text-xs font-semibold text-[#C45F0A] ring-1 ring-teal-200">
                  SuperAdmin
                </span>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Mail size={14} className="shrink-0 text-slate-400" strokeWidth={2} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-400">Correo electrónico</p>
                    <p className="truncate text-sm font-medium text-slate-900">{usuario.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <ShieldCheck size={14} className="shrink-0 text-slate-400" strokeWidth={2} />
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Rol</p>
                    <p className="text-sm font-medium text-slate-900">SuperAdmin</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <UserCircle size={14} className="shrink-0 text-slate-400" strokeWidth={2} />
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Cuenta creada</p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDateTime(usuario.created_at)}
                    </p>
                  </div>
                </div>
                {usuario.ultimo_acceso && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <KeyRound size={14} className="shrink-0 text-slate-400" strokeWidth={2} />
                    <div>
                      <p className="text-[11px] font-medium text-slate-400">Último acceso</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDateTime(usuario.ultimo_acceso)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Change password */}
        <article className="rounded-xl border border-slate-200 bg-white p-7">
          <div className="mb-6 space-y-1">
            <h2 className="text-[15px] font-semibold text-slate-950">Cambiar contraseña</h2>
            <p className="text-sm text-slate-400">
              Usa una contraseña segura de al menos 8 caracteres.
            </p>
          </div>

          <form action={changePasswordAction} className="grid gap-5">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Contraseña actual</span>
              <input
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#E8761A] focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Nueva contraseña</span>
              <input
                name="new_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#E8761A] focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Confirmar nueva contraseña</span>
              <input
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#E8761A] focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <button
              type="submit"
              className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-[#E8761A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C45F0A]"
            >
              <KeyRound size={15} strokeWidth={2} />
              Actualizar contraseña
            </button>
          </form>
        </article>
      </div>
    </div>
  )
}
