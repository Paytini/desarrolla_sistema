"use client"

import { useState } from "react"
import { importEmployeesCsvAction } from "@/app/(portal)/company/[slug]/employees/actions"

const COLUMNS = [
  { key: "nombre", label: "nombre", required: true },
  { key: "apellido", label: "apellido", required: true },
  { key: "email", label: "email", required: true },
  { key: "curp", label: "curp", required: true },
  { key: "departamento", label: "departamento", required: true },
  { key: "puesto", label: "puesto", required: true },
  { key: "ocupacion_especifica_clave", label: "ocupacion_especifica_clave", required: true },
  { key: "ocupacion_especifica", label: "ocupacion_especifica", required: true },
  { key: "password", label: "password", required: false },
]

const SAMPLE_ROWS = [
  {
    nombre: "Ana",
    apellido: "Perez",
    email: "ana@empresa.com",
    curp: "PEAA900101HBCXXX01",
    departamento: "Operaciones",
    puesto: "Supervisor",
    ocupacion_especifica_clave: "03.4",
    ocupacion_especifica: "Instalacion y mantenimiento",
    password: "Temporal123",
  },
  {
    nombre: "Luis",
    apellido: "Lopez",
    email: "luis@empresa.com",
    curp: "LOPL910202HBCXXX02",
    departamento: "Seguridad",
    puesto: "Supervisor",
    ocupacion_especifica_clave: "07.2",
    ocupacion_especifica: "Supervision de seguridad",
    password: "Temporal123",
  },
]

const requiredCount = COLUMNS.filter((column) => column.required).length
const optionalCount = COLUMNS.length - requiredCount

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
        {n}
      </span>
      <p className="text-sm font-semibold text-slate-950">{title}</p>
    </div>
  )
}

export default function CsvEmployeeImportForm() {
  const [showExample, setShowExample] = useState(false)

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <StepHeader n={1} title="Descarga la plantilla" />
        <p className="mt-1.5 pl-8 text-xs leading-5 text-slate-500">
          Trae las columnas listas: {requiredCount} obligatorias y {optionalCount} opcional.
        </p>
        <div className="pl-8">
          <a
            href="/api/templates/employees-csv"
            className="mt-3 inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-slate-800 transition-all duration-200 hover:bg-gray-200"
          >
            Descargar plantilla CSV
          </a>
        </div>
      </div>

      <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
        <StepHeader n={2} title="Llena la plantilla" />
        <div className="min-w-0 pl-8">
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            Un empleado por fila. Las columnas obligatorias deben venir llenas.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF1FE] px-2.5 py-1 text-[#2A61D6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3579F5]" />
              Obligatorio
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Opcional
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowExample((v) => !v)}
            className="mt-3 text-xs font-semibold text-[#2A61D6] hover:underline"
          >
            {showExample ? "Ocultar ejemplo de la plantilla" : "Ver ejemplo de la plantilla"}
          </button>

          {showExample ? (
            <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-lg bg-slate-50 p-3">
              <div className="min-w-0 max-w-full overflow-x-auto rounded-lg bg-white">
                <table className="min-w-[1280px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-center text-xs font-semibold text-slate-500">
                      <th className="w-12 border-b border-r border-slate-200 px-3 py-2" />
                      {COLUMNS.map((column, index) => (
                        <th
                          key={`letter-${column.key}`}
                          className="border-b border-r border-slate-200 px-4 py-2 last:border-r-0"
                        >
                          {String.fromCharCode(65 + index)}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-white text-left text-slate-800">
                      <th className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                        1
                      </th>
                      {COLUMNS.map((column) => (
                        <th
                          key={column.key}
                          className="border-b border-r border-slate-200 px-4 py-3 last:border-r-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{column.label}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                column.required
                                  ? "bg-[#EAF1FE] text-[#2A61D6]"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {column.required ? "obligatorio" : "opcional"}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {SAMPLE_ROWS.map((row, rowIndex) => (
                      <tr key={row.email} className="transition hover:bg-[#EAF1FE]/40">
                        <td className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                          {rowIndex + 2}
                        </td>
                        {COLUMNS.map((column) => (
                          <td
                            key={`${row.email}-${column.key}`}
                            className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-3 last:border-r-0"
                          >
                            {row[column.key as keyof typeof row]}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-slate-50/70 text-slate-400">
                      <td className="border-r border-slate-200 px-3 py-3 text-center text-xs font-semibold">
                        ...
                      </td>
                      <td colSpan={COLUMNS.length} className="px-4 py-3 text-xs">
                        Puedes agregar mas empleados, uno por fila, hasta 200 registros por archivo.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 grid gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950 md:grid-cols-[auto_1fr] md:items-start">
                <span className="rounded-full bg-amber-200 px-2.5 py-1 font-semibold text-amber-950">
                  Nota
                </span>
                <p>
                  Si el CSV no incluye la columna <span className="font-semibold">password</span>,
                  captura abajo un password temporal por defecto para todos los empleados de esa carga.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form
        action={importEmployeesCsvAction}
        className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4"
        data-loading-message="Importando empleados..."
        data-loading-detail="Estamos leyendo el CSV, creando usuarios y sincronizando accesos. Mantendremos este modal abierto hasta terminar."
      >
        <StepHeader n={3} title="Sube tu archivo" />

        <div className="grid gap-4 pl-8">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Archivo CSV</span>
            <input
              name="archivo_csv"
              type="file"
              accept=".csv,text/csv"
              required
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Password temporal por defecto</span>
            <input
              name="password_csv"
              type="text"
              minLength={8}
              placeholder="Recomendado si tu CSV no incluye columna password"
              className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#3579F5]"
            />
          </label>

          <button
            type="submit"
            className="inline-flex w-fit items-center rounded-full bg-[#3579F5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2A61D6]"
          >
            Importar empleados
          </button>
        </div>
      </form>
    </div>
  )
}
