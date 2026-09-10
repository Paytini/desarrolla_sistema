"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, X } from "lucide-react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Dialog from "@mui/material/Dialog"
import IconButton from "@mui/material/IconButton"
import Snackbar from "@mui/material/Snackbar"
import Typography from "@mui/material/Typography"
import CnoSelect from "@/components/company/CnoSelect"
import { updateEmployeeAction } from "@/app/(portal)/company/[slug]/employees/actions"
import { validateEmployeeEdit } from "@/lib/company/employees"

type EmployeeEditModalProps = {
  employee: {
    id: string
    first_name: string
    last_name: string
    second_last_name: string | null
    email: string
    curp: string | null
    department: string | null
    position: string | null
    occupation_code: string | null
    occupation_name: string | null
  }
}

const inputClass =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none transition focus:border-portal-blue"

export default function EmployeeEditModal({ employee }: EmployeeEditModalProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOpen, setSavedOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function close() {
    setOpen(false)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const quick = validateEmployeeEdit({
      nombre: String(formData.get("nombre") ?? ""),
      apellido: String(formData.get("apellido") ?? ""),
      curp: String(formData.get("curp") ?? ""),
    })
    if (!quick.ok) {
      setError(quick.error)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateEmployeeAction(formData)
      if (result.ok) {
        close()
        setSavedOpen(true)
        router.refresh()
      } else {
        setError(result.error ?? "No se pudieron guardar los cambios.")
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:border-portal-blue/40 hover:text-portal-blue"
      >
        <Pencil size={15} strokeWidth={2} />
        Editar
      </button>

      <Dialog
        open={open}
        onClose={close}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "20px",
              border: "1px solid",
              borderColor: "divider",
              maxHeight: "min(880px, 92vh)",
            },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            px: 3,
            pt: 2.5,
            pb: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box>
            <Typography component="h2" sx={{ fontWeight: 600, fontSize: 18 }}>
              Editar información
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
              Corrige los datos del empleado si hay algún error.
            </Typography>
          </Box>
          <IconButton onClick={close} aria-label="Cerrar" size="small">
            <X size={18} />
          </IconButton>
        </Box>

        <form ref={formRef} onSubmit={handleSubmit} autoComplete="off" className="grid gap-4 p-3 sm:p-5">
          <input type="hidden" name="empleado_id" value={employee.id} />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Datos personales
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700">Nombre(s)</span>
                <input name="nombre" required defaultValue={employee.first_name} className={inputClass} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700">Apellido paterno</span>
                <input name="apellido" required defaultValue={employee.last_name} className={inputClass} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700">Apellido materno</span>
                <input
                  name="apellido_materno"
                  defaultValue={employee.second_last_name ?? ""}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-700">Correo electrónico</span>
              <input
                value={employee.email}
                disabled
                className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500"
              />
              <span className="text-xs text-slate-400">
                El correo no se edita aquí: está ligado al inicio de sesión y a WordPress.
              </span>
            </label>
          </fieldset>

          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Puesto
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700">Departamento</span>
                <input
                  name="departamento"
                  defaultValue={employee.department ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700">Puesto</span>
                <input name="puesto" defaultValue={employee.position ?? ""} className={inputClass} />
              </label>
            </div>
          </fieldset>

          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Datos para la constancia DC-3
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700">CURP</span>
                <input
                  name="curp"
                  maxLength={18}
                  defaultValue={employee.curp ?? ""}
                  placeholder="18 caracteres"
                  className={`${inputClass} uppercase`}
                />
              </label>
              <CnoSelect
                defaultCode={employee.occupation_code}
                defaultName={employee.occupation_name}
              />
            </div>
          </fieldset>

          <div className="mt-1 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={close}
              disabled={isPending}
              className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-11 rounded-lg bg-portal-blue px-5 text-sm font-semibold text-white transition hover:bg-portal-blue-hover disabled:opacity-60"
            >
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Dialog>

      <Snackbar
        open={savedOpen}
        autoHideDuration={4000}
        onClose={() => setSavedOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="standard"
          onClose={() => setSavedOpen(false)}
          sx={{ borderRadius: "12px" }}
        >
          Información del empleado actualizada.
        </Alert>
      </Snackbar>
    </>
  )
}
