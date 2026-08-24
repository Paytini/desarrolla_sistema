"use client"

import { useState } from "react"
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
  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW)

  function updatePreview(field: keyof PreviewState) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setPreview((current) => ({ ...current, [field]: event.target.value }))
    }
  }

  const fullName = [preview.nombre, preview.apellido, preview.apellidoMaterno]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <form
        action={createEmployeeAction}
        autoComplete="off"
        className="grid gap-3"
        data-loading-message="Creando empleado..."
        data-loading-detail="Estamos registrando al empleado y sincronizando su acceso en Tutor LMS."
      >
        <p className="text-xs text-slate-500">Todos los campos son obligatorios.</p>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-[14px] font-normal text-slate-700">Apellido paterno</span>
            <input
              name="apellido"
              required
              onChange={updatePreview("apellido")}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-[14px] font-normal text-slate-700">Apellido materno</span>
            <input
              name="apellido_materno"
              required
              onChange={updatePreview("apellidoMaterno")}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">Nombre(s)</span>
          <input
            name="nombre"
            required
            onChange={updatePreview("nombre")}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
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
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
          />
        </label>

        <p className="text-xs text-slate-500">
          El empleado recibirá un correo para crear su propia contraseña y activar su cuenta.
        </p>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 block px-0 text-xs text-slate-500">
            Estos datos se usan para generar la constancia DC-3 del empleado.
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 uppercase outline-none transition focus:border-portal-blue"
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

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-[14px] font-normal text-slate-700">Departamento</span>
            <input
              name="departamento"
              required
              onChange={updatePreview("departamento")}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-[14px] font-normal text-slate-700">Puesto</span>
            <input
              name="puesto"
              required
              onChange={updatePreview("puesto")}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-portal-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-portal-blue-hover"
          >
            Crear empleado
          </button>
        </div>
      </form>

      <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 lg:sticky lg:top-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Vista previa
        </p>
        <div className="grid gap-3">
          <PreviewField label="Nombre completo" value={fullName} />
          <PreviewField label="Correo" value={preview.email} />
          <PreviewField label="CURP" value={preview.curp.toUpperCase()} />
          <PreviewField label="Ocupación (CNO)" value={preview.ocupacion} />
          <PreviewField label="Departamento" value={preview.departamento} />
          <PreviewField label="Puesto" value={preview.puesto} />
        </div>
      </aside>
    </div>
  )
}
