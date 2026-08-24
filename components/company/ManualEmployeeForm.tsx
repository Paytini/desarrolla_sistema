import { createEmployeeAction } from "@/app/(portal)/company/[slug]/employees/actions"
import CnoSelect from "@/components/company/CnoSelect"
import CurpInfoButton from "@/components/company/CurpInfoButton"

export default function ManualEmployeeForm() {
  return (
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
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">Apellido materno</span>
          <input
            name="apellido_materno"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-[14px] font-normal text-slate-700">Nombre(s)</span>
        <input
          name="nombre"
          required
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
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
        />
      </label>

      <p className="text-xs text-slate-500">
        El empleado recibirá un correo para crear su propia contraseña y activar su cuenta.
      </p>

      <fieldset className="m-0 rounded-lg border-0 bg-gray-50 p-3">
        <legend className="mb-2 block px-0 text-xs text-slate-500">Constancia DC-3</legend>
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 uppercase outline-none transition focus:border-portal-blue"
            />
          </label>
          <CnoSelect required />
        </div>
      </fieldset>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">Departamento</span>
          <input
            name="departamento"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-portal-blue"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">Puesto</span>
          <input
            name="puesto"
            required
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
  )
}
