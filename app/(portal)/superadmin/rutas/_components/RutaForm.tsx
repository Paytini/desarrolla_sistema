"use client"

import { useState } from "react"

type CursoInput = { wp_curso_id: number; nombre_curso: string; orden: number }
type AvailableCourse = { wp_curso_id: number; nombre_curso: string }
type EmpresaOption = { id: number; nombre: string }

type RutaFormProps = {
  availableCourses: AvailableCourse[]
  availableEmpresas: EmpresaOption[]
  initialNombre?: string
  initialDescripcion?: string
  initialCursos?: CursoInput[]
  initialEmpresaIds?: number[]
  initialActivo?: boolean
  action: (formData: FormData) => void | Promise<void>
  submitLabel: string
  onDelete?: (formData: FormData) => void | Promise<void>
}

export default function RutaForm({
  availableCourses,
  availableEmpresas,
  initialNombre = "",
  initialDescripcion = "",
  initialCursos = [],
  initialEmpresaIds = [],
  initialActivo = true,
  action,
  submitLabel,
  onDelete,
}: RutaFormProps) {
  const [nombre, setNombre] = useState(initialNombre)
  const [descripcion, setDescripcion] = useState(initialDescripcion)
  const [cursos, setCursos] = useState<CursoInput[]>(
    initialCursos.map((c, i) => ({ ...c, orden: i + 1 }))
  )
  const [empresaIds, setEmpresaIds] = useState<number[]>(initialEmpresaIds)
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("")
  const [activo, setActivo] = useState(initialActivo)

  function addCourse() {
    if (!selectedCourseId) return
    if (cursos.find((c) => c.wp_curso_id === selectedCourseId)) return
    const course = availableCourses.find((c) => c.wp_curso_id === selectedCourseId)
    if (!course) return
    setCursos((prev) => [
      ...prev,
      { wp_curso_id: course.wp_curso_id, nombre_curso: course.nombre_curso, orden: prev.length + 1 },
    ])
    setSelectedCourseId("")
  }

  function removeCourse(wp_curso_id: number) {
    setCursos((prev) =>
      prev
        .filter((c) => c.wp_curso_id !== wp_curso_id)
        .map((c, i) => ({ ...c, orden: i + 1 }))
    )
  }

  function moveCourse(index: number, direction: -1 | 1) {
    const newIdx = index + direction
    if (newIdx < 0 || newIdx >= cursos.length) return
    const updated = [...cursos]
    ;[updated[index], updated[newIdx]] = [updated[newIdx], updated[index]]
    setCursos(updated.map((c, i) => ({ ...c, orden: i + 1 })))
  }

  function toggleEmpresa(id: number) {
    setEmpresaIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  const availableToAdd = availableCourses.filter(
    (c) => !cursos.find((ec) => ec.wp_curso_id === c.wp_curso_id)
  )

  return (
    <form action={action} className="space-y-6">
      {/* Serialized state */}
      <input type="hidden" name="cursosJson" value={JSON.stringify(cursos)} />
      <input type="hidden" name="empresaIdsJson" value={JSON.stringify(empresaIds)} />
      <input type="hidden" name="activo" value={String(activo)} />

      {/* Nombre */}
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
          Nombre <span className="text-rose-500">*</span>
        </label>
        <input
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#E8761A]"
          placeholder="Ej: Operador de planta"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
          Descripción (opcional)
        </label>
        <textarea
          name="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#E8761A]"
          placeholder="Ruta para operadores en área de producción"
        />
      </div>

      {/* Cursos en orden */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
          Cursos en orden
        </label>
        <div className="mb-2 space-y-1.5">
          {cursos.length === 0 && (
            <p className="text-xs text-[#94a3b8]">Sin cursos agregados aún.</p>
          )}
          {cursos.map((c, i) => (
            <div
              key={c.wp_curso_id}
              className="flex items-center gap-2 rounded-xl border border-[#f0f0f0] bg-white px-3 py-2"
            >
              <span className="w-5 shrink-0 text-center text-xs font-bold text-[#94a3b8]">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-[#1a1a1a]">{c.nombre_curso}</span>
              <button
                type="button"
                onClick={() => moveCourse(i, -1)}
                disabled={i === 0}
                className="text-sm text-[#94a3b8] hover:text-[#1a1a1a] disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveCourse(i, 1)}
                disabled={i === cursos.length - 1}
                className="text-sm text-[#94a3b8] hover:text-[#1a1a1a] disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeCourse(c.wp_curso_id)}
                className="text-sm text-rose-400 hover:text-rose-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(Number(e.target.value) || "")}
            className="flex-1 rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#E8761A]"
          >
            <option value="">Seleccionar curso…</option>
            {availableToAdd.map((c) => (
              <option key={c.wp_curso_id} value={c.wp_curso_id}>
                {c.nombre_curso}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addCourse}
            disabled={!selectedCourseId}
            className="rounded-xl border border-[#E8761A] px-4 py-2 text-sm font-semibold text-[#E8761A] hover:bg-[#fff5ed] disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Empresas */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
          Asignar a empresas
        </label>
        {availableEmpresas.length === 0 ? (
          <p className="text-xs text-[#94a3b8]">No hay empresas activas.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableEmpresas.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleEmpresa(e.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  empresaIds.includes(e.id)
                    ? "border border-[#E8761A] bg-[#fff5ed] text-[#E8761A]"
                    : "border border-transparent bg-[#f1f5f9] text-[#64748b] hover:border-[#e2e8f0]"
                }`}
              >
                {empresaIds.includes(e.id) ? "✓ " : ""}
                {e.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activo toggle — solo en modo editar */}
      {onDelete !== undefined && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="activo-toggle"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="size-4 accent-[#E8761A]"
          />
          <label htmlFor="activo-toggle" className="text-sm text-[#1a1a1a]">
            Ruta activa
          </label>
        </div>
      )}

      {/* Botones */}
      <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-4">
        <div>
          {onDelete && (
            <button
              type="submit"
              formAction={onDelete}
              className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              Eliminar ruta
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-xl bg-[#E8761A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#C45F0A]"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
