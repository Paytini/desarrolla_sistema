"use client"

import { Info } from "lucide-react"
import { useRef, useState } from "react"
import { createEmployeeAction } from "@/app/(portal)/company/[slug]/employees/actions"
import CnoSelect, { type CnoEntry } from "@/components/company/CnoSelect"
import CurpInfoButton from "@/components/company/CurpInfoButton"

type PreviewState = {
  nombre: string
  apellido: string
  apellidoMaterno: string
  email: string
  curp: string
  ocupacion: string
  departamento: string
  puesto: string
}

const EMPTY_PREVIEW: PreviewState = {
  nombre: "",
  apellido: "",
  apellidoMaterno: "",
  email: "",
  curp: "",
  ocupacion: "",
  departamento: "",
  puesto: "",
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm text-slate-800">{value || "—"}</p>
    </div>
  )
}

export default function ManualEmployeeForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const confirmHeadingRef = useRef<HTMLHeadingElement>(null)
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW)

  function updatePreview(field: keyof PreviewState) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setPreview((current) => ({ ...current, [field]: event.target.value }))
    }
  }

  function handleReviewClick() {
    if (formRef.current && !formRef.current.reportValidity()) {
      return
    }

    setStep("confirm")
    requestAnimationFrame(() => confirmHeadingRef.current?.focus())
  }

  const fullName = [preview.nombre, preview.apellido, preview.apellidoMaterno]
    .filter(Boolean)
    .join(" ")

  return (
    <form
      ref={formRef}
      action={createEmployeeAction}
      autoComplete="off"
      className="grid gap-2.5"
      data-loading-message="Creando empleado..."
      data-loading-detail="Estamos registrando al empleado y sincronizando su acceso en Tutor LMS."
    >
      <div className={step === "form" ? "grid gap-2.5" : "hidden"}>
        <div className="flex items-start gap-2 rounded-lg bg-portal-blue-soft px-3 py-2 text-xs leading-5 text-portal-blue-hover">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            La CURP y la Ocupación (CNO) que captures se usarán para generar la constancia DC-3
            del empleado.
          </p>
        </div>

        <p className="text-xs text-slate-500">Todos los campos son obligatorios.</p>

        <div className="grid gap-2.5 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-[14px] font-normal text-slate-700">Apellido paterno</span>
            <input
              name="apellido"
              required
              onChange={updatePreview("apellido")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none transition focus:border-portal-blue"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-[14px] font-normal text-slate-700">Apellido materno</span>
            <input
              name="apellido_materno"
              required
              onChange={updatePreview("apellidoMaterno")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none transition focus:border-portal-blue"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">Nombre(s)</span>
          <input
            name="nombre"
            required
            onChange={updatePreview("nombre")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none transition focus:border-portal-blue"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">Correo electrónico</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            onChange={updatePreview("email")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none transition focus:border-portal-blue"
          />
        </label>

        <p className="text-xs text-slate-500">
          El empleado recibirá un correo para crear su propia contraseña y activar su cuenta.
        </p>

        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Datos para la constancia DC-3</legend>
          <div className="grid gap-2.5 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="flex items-center gap-1.5 text-[14px] font-normal text-slate-700">
                CURP
                <CurpInfoButton />
              </span>
              <input
                name="curp"
                required
                maxLength={18}
                placeholder="18 caracteres"
                onChange={updatePreview("curp")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm uppercase outline-none transition focus:border-portal-blue"
              />
            </label>
            <CnoSelect
              required
              onSelectionChange={(entry: CnoEntry | null) =>
                setPreview((current) => ({ ...current, ocupacion: entry?.denominacion ?? "" }))
              }
            />
          </div>
        </fieldset>

        <div className="grid gap-2.5 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-[14px] font-normal text-slate-700">Departamento</span>
            <input
              name="departamento"
              required
              onChange={updatePreview("departamento")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none transition focus:border-portal-blue"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-[14px] font-normal text-slate-700">Puesto</span>
            <input
              name="puesto"
              required
              onChange={updatePreview("puesto")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none transition focus:border-portal-blue"
            />
          </label>
        </div>
      </div>

      {step === "confirm" ? (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-gray-50 p-4">
          <div>
            <h3
              ref={confirmHeadingRef}
              tabIndex={-1}
              className="text-sm font-semibold text-slate-950 outline-none"
            >
              Confirma la información antes de crear al empleado
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              El empleado recibirá un correo para activar su cuenta en cuanto confirmes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PreviewField label="Nombre completo" value={fullName} />
            <PreviewField label="Correo" value={preview.email} />
            <PreviewField label="CURP" value={preview.curp.toUpperCase()} />
            <PreviewField label="Ocupación (CNO)" value={preview.ocupacion} />
            <PreviewField label="Departamento" value={preview.departamento} />
            <PreviewField label="Puesto" value={preview.puesto} />
          </div>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        {step === "confirm" ? (
          <>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="inline-flex items-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a editar
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-portal-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-portal-blue-hover"
            >
              Confirmar y crear empleado
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleReviewClick}
            className="inline-flex items-center rounded-full bg-portal-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-portal-blue-hover"
          >
            Crear empleado
          </button>
        )}
      </div>
    </form>
  )
}
