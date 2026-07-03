import { getSession } from "@/lib/session"
import { readSearchParam, type SearchParamsRecord } from "@/lib/search-params"
import { redirect } from "next/navigation"
import { LogoutButton } from "./LogoutButton"

const REASON_MESSAGES: Record<string, string> = {
  suspendida: "Tu empresa fue suspendida por Desarrolla360.",
  vencida: "El acceso de tu empresa venció.",
}

export default async function CuentaSuspendidaPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const reason = readSearchParam(params, "reason")
  const message = (reason && REASON_MESSAGES[reason]) ?? "Tu acceso al portal no está disponible."

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <section
        role="alert"
        className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-rose-200 bg-white shadow-2xl"
      >
        <div className="border-b border-rose-100 bg-rose-50 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
            Acceso no disponible
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">{message}</h1>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="text-sm leading-6 text-slate-700">
            Contacta a Desarrolla360 por WhatsApp o correo para reactivar el acceso de tu
            empresa.
          </p>

          <div className="flex justify-end">
            <LogoutButton />
          </div>
        </div>
      </section>
    </div>
  )
}
