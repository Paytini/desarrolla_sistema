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
import { SubmitButton } from "@/components/superadmin/SubmitButton"
import PackageCourseSelector from "@/components/portal/PackageCourseSelector"
import { createPackageAction } from "@/app/(portal)/superadmin/paquetes/actions"

const labelClass = "text-[10px] font-bold uppercase tracking-[0.08em]"
const labelStyle = { color: "#94a3b8" }

export function CreatePaqueteSheet({ defaultOpen }: { defaultOpen: boolean }) {
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
        Nuevo paquete
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Nuevo paquete</SheetTitle>
          <SheetDescription>
            Define un paquete con cursos de Tutor LMS y, opcionalmente, un bundle privado.
          </SheetDescription>
        </SheetHeader>

        <form action={createPackageAction} className="grid gap-4 px-4 pb-4">
          <div className="grid gap-1.5">
            <Label className={labelClass} style={labelStyle}>Nombre del paquete *</Label>
            <Input name="nombre" required placeholder="Ej: Paquete Seguridad Industrial" />
          </div>

          <div className="grid gap-1.5">
            <Label className={labelClass} style={labelStyle}>Descripción</Label>
            <Textarea name="descripcion" rows={2} placeholder="Descripción del paquete…" />
          </div>

          <div className="grid gap-1.5">
            <Label className={labelClass} style={labelStyle}>Modo de entrega B2B</Label>
            <select
              name="modo_entrega"
              defaultValue="DIRECT_ENROLLMENT"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="DIRECT_ENROLLMENT">Matrícula directa por curso (Recomendado)</option>
              <option value="PRIVATE_BUNDLE_REFERENCE">Bundle privado como referencia operativa</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>WP Bundle ID</Label>
              <Input name="wp_bundle_id" type="number" min={1} placeholder="Opcional" />
            </div>
            <div className="grid gap-1.5">
              <Label className={labelClass} style={labelStyle}>Nombre del bundle</Label>
              <Input name="nombre_bundle" placeholder="Auto si se crea desde el portal" />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-[12px] leading-5 text-muted-foreground">
            Si dejas vacío <strong>WP Bundle ID</strong>, el portal intentará crear un bundle privado en Tutor LMS.
          </div>

          <div className="grid gap-1.5">
            <Label className={labelClass} style={labelStyle}>Notas operativas</Label>
            <Textarea name="notas_operativas" rows={2} />
          </div>

          <div className="grid gap-1.5">
            <Label className={labelClass} style={labelStyle}>Cursos del paquete *</Label>
            <PackageCourseSelector />
          </div>

          <SubmitButton className="w-full bg-brand text-brand-ink hover:bg-brand/90">
            Guardar paquete
          </SubmitButton>
        </form>
      </SheetContent>
    </Sheet>
  )
}
