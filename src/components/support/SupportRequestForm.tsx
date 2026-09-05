"use client"

import { useActionState } from "react"
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react"
import { submitSupportRequestAction, type SupportActionState } from "@/app/(portal)/support/actions"
import { SUPPORT_REASONS } from "@/lib/support-reasons"

const SUPPORT_EMAIL = "soporte@desarrolla360.com"

export function SupportRequestForm({ userName }: { userName: string }) {
  const [state, formAction, pending] = useActionState<SupportActionState, FormData>(
    submitSupportRequestAction,
    null,
  )

  if (state && "success" in state && state.success) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-portal-border bg-white p-8 text-center">
        <CheckCircle2 size={40} className="mb-3 text-emerald-600" />
        <h2 className="text-base font-semibold text-portal-ink">¡Mensaje enviado, {userName}!</h2>
        <p className="mt-1.5 max-w-sm text-sm text-slate-500">
          Nuestro equipo te responderá a tu correo en menos de 24 horas hábiles.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="rounded-lg border border-portal-border bg-white p-6">
      <h2 className="text-base font-semibold text-portal-ink">Escríbenos</h2>
      <p className="mt-1 text-sm text-slate-500">
        Cuéntanos qué necesitas y te responderemos a tu correo registrado.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Motivo de contacto</span>
          <select
            name="reason"
            required
            disabled={pending}
            defaultValue=""
            className="h-11 rounded-lg border border-portal-border px-3 text-sm text-slate-700 outline-none transition focus:border-portal-blue disabled:bg-slate-50"
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            {SUPPORT_REASONS.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Mensaje</span>
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={1000}
            rows={5}
            disabled={pending}
            placeholder="Describe tu duda o problema con el mayor detalle posible..."
            className="rounded-lg border border-portal-border px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-portal-blue disabled:bg-slate-50"
          />
        </label>

        {state && "error" in state && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-portal-blue px-5 text-sm font-semibold text-white transition hover:bg-portal-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Loader2 size={16} className="animate-spin" />}
            {pending ? "Enviando..." : "Enviar mensaje"}
          </button>
          <span className="text-xs text-slate-400">
            ¿Prefieres tu correo?{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-portal-blue hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </span>
        </div>
      </div>
    </form>
  )
}
