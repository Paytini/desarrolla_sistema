import { Clock, MessageCircleQuestion } from "lucide-react"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { SupportRequestForm } from "@/components/support/SupportRequestForm"
import { getSession } from "@/lib/session"

const FAQS_BY_ROLE: Record<"SUPERADMIN" | "HR" | "EMPLOYEE", { question: string; answer: string }[]> = {
  SUPERADMIN: [
    {
      question: "¿Cómo doy de alta una nueva empresa?",
      answer:
        "Ve a Empresas > Nueva empresa y completa los datos de la empresa, su usuario de RH y el paquete inicial.",
    },
    {
      question: "¿Cómo verifico el estado de la integración con WordPress?",
      answer:
        "En Integración WP puedes ver si el bridge responde correctamente y el estado del webhook académico.",
    },
    {
      question: "¿Cómo configuro los datos oficiales de una constancia DC-3?",
      answer:
        "Desde Editor DC-3 puedes definir la duración, área temática, agente capacitador e instructor de cada curso.",
    },
  ],
  HR: [
    {
      question: "¿Cómo agrego un nuevo empleado?",
      answer:
        "Desde Empleados > Agregar empleado puedes darlo de alta manualmente, o importar varios a la vez con un archivo CSV.",
    },
    {
      question: "¿Cómo asigno un curso o paquete a un empleado?",
      answer:
        "En Asignaciones selecciona al empleado y elige entre los cursos disponibles en el paquete contratado de tu empresa.",
    },
    {
      question: "¿Dónde veo las constancias DC-3 de mis empleados?",
      answer:
        "En Constancias puedes filtrar por empleado, departamento o curso, y descargar el diploma o la constancia DC-3.",
    },
    {
      question: "¿Qué hago si un empleado no puede iniciar sesión?",
      answer:
        "Verifica que su cuenta siga activa en Empleados. Si acaba de ingresar, confirma que esté usando la contraseña que le asignaste al crearlo.",
    },
  ],
  EMPLOYEE: [
    {
      question: "¿Dónde veo los cursos que tengo asignados?",
      answer: "En Mis cursos puedes ver tu progreso y continuar justo donde te quedaste.",
    },
    {
      question: "¿Cómo descargo mi constancia DC-3?",
      answer: "Una vez que termines un curso, tu constancia aparecerá en Mis constancias para descargarla.",
    },
    {
      question: "Olvidé mi contraseña, ¿qué hago?",
      answer: "Contacta al área de RH de tu empresa para que te asigne una contraseña nueva.",
    },
  ],
}

export default async function SupportPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const role = session.user.role as "SUPERADMIN" | "HR" | "EMPLOYEE"
  const faqs = FAQS_BY_ROLE[role]
  const userName = session.user.nombre as string

  return (
    <div className="max-w-7xl space-y-6">
      <PageHeader title="Soporte" description="Estamos para ayudarte con cualquier duda del portal." />

      <div className="grid gap-6 lg:grid-cols-[1fr_560px]">
        <div className="space-y-6">
          <SupportRequestForm userName={userName} />

          <section className="rounded-lg border border-portal-border bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircleQuestion size={18} strokeWidth={1.8} className="text-slate-400" />
              <h2 className="text-base font-semibold text-[#1a1a1a]">Preguntas frecuentes</h2>
            </div>

            <div className="divide-y divide-portal-border">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-3 first:pt-0 last:pb-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[#1a1a1a] outline-none focus-visible:ring-2 focus-visible:ring-portal-blue">
                    {faq.question}
                    <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-180">
                      ⌄
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <aside className="h-fit rounded-lg border border-portal-border bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={16} strokeWidth={1.8} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-[#1a1a1a]">Horario de atención</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Días</dt>
                <dd className="font-medium text-[#1a1a1a]">Lunes a viernes</dd>
              </div>
              <div>
                <dt className="text-slate-500">Horario</dt>
                <dd className="font-medium text-[#1a1a1a]">7:00 a.m. – 4:00 p.m.</dd>
              </div>
              <div>
                <dt className="text-slate-500">Tiempo de respuesta</dt>
                <dd className="font-medium text-[#1a1a1a]">Menos de 24 horas hábiles</dd>
              </div>
            </dl>
          </aside>

          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static illustration asset */}
            <img src="/illustrations/undraw_chat-bot_c8iw.svg" alt="" className="w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
