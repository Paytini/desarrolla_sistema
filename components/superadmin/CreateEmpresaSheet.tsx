import { Plus } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PasswordToggleInput } from "@/components/superadmin/PasswordToggleInput"
import { SubmitButton } from "@/components/superadmin/SubmitButton"
import { createCompanyAction } from "@/app/(portal)/superadmin/empresas/actions"
import type { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"

type Paquete = Awaited<ReturnType<typeof getSuperadminEmpresasSnapshot>>["paquetes"][number]

const labelClass = "text-[10px] font-bold uppercase tracking-[0.08em]"
const labelStyle = { color: "#94a3b8" }

export function CreateEmpresaSheet({ paquetes, defaultOpen }: { paquetes: Paquete[]; defaultOpen: boolean }) {
  return (
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-brand-ink shadow-[0_4px_14px_-4px_rgba(245,133,63,0.5)] transition-all hover:-translate-y-px hover:shadow-[0_6px_18px_-4px_rgba(245,133,63,0.6)]"
          />
        }
      >
        <Plus size={14} strokeWidth={2.5} />
        Nueva empresa
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Alta de empresa</SheetTitle>
          <SheetDescription>Crea la empresa y su usuario RH primario.</SheetDescription>
        </SheetHeader>

        <form action={createCompanyAction} className="grid gap-4 px-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>Nombre *</Label>
              <Input name="nombre" required placeholder="CEMEX S.A. de C.V." />
            </div>
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>Correo RH *</Label>
              <Input name="email_rh" type="email" required placeholder="rh@empresa.com" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>Responsable RH *</Label>
              <Input name="nombre_rh" required placeholder="María González" />
            </div>
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>Password temporal *</Label>
              <PasswordToggleInput name="password_rh" minLength={8} required placeholder="Mín. 8 caracteres" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>Teléfono</Label>
              <Input name="telefono" placeholder="55 1234 5678" />
            </div>
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>RFC</Label>
              <Input name="rfc" placeholder="XAXX010101000" />
            </div>
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>Cupos *</Label>
              <Input name="asientos_contratados" type="number" min={1} defaultValue={25} required />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>Paquete inicial</Label>
              <select
                name="paquete_id"
                defaultValue=""
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Sin asignar</option>
                {paquetes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>Vigencia</Label>
              <Input name="fecha_vencimiento" type="date" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className={labelClass} style={labelStyle}>Notas internas</Label>
            <Textarea name="notas" rows={2} placeholder="Observaciones o notas del contrato…" />
          </div>

          <SubmitButton className="w-full">
            <Plus size={14} strokeWidth={2.5} />
            Crear empresa
          </SubmitButton>
        </form>
      </SheetContent>
    </Sheet>
  )
}
