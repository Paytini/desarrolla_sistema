# Portal RH — Rediseño Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Actualizar la capa visual de las 5 páginas del portal RH (`/empresa`) para que sean consistentes con el sistema de diseño naranja/blanco/charcoal del SuperAdmin. Cero cambios a lógica de negocio.

**Architecture:** Pure visual update — swap teal/violet → orange, remove 5 inline `KpiCard` functions and use the shared `components/portal/KpiCard`, inject `PageHeader` and `StatusBadge` where specified. No changes to Server Actions, Prisma queries, or auth logic.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind CSS v4, `lucide-react` icons. Shared portal components at `components/portal/`: `KpiCard`, `StatusBadge`, `PageHeader`.

**Constraint:** NO `linear-gradient` or `bg-gradient-*` anywhere. All backgrounds use solid colors only.

---

## Shared Component Reference (read-only)

**`components/portal/KpiCard`** — Props: `label: string`, `value: string`, `sub?: string`, `icon?: LucideIcon`, `borderColor?: "orange"|"charcoal"|"amber"|"rose"|"blue"|"green"`. Note: prop is `icon` (lowercase), not `Icon`.

**`components/portal/PageHeader`** — Props: `eyebrow?: string`, `title: string`, `description: string` (required), `actions?: ReactNode`.

**`components/portal/StatusBadge`** — Props: `variant: "green"|"amber"|"red"|"slate"|"blue"|"orange"`, `children: ReactNode`, `dot?: boolean`.

---

## Global Substitution Table

Apply these wherever they appear in the 5 pages:

| Find | Replace |
|---|---|
| `text-teal-600` | `text-[#E8761A]` |
| `text-teal-700` | `text-[#C45F0A]` |
| `bg-teal-50` | `bg-[#fff5ed]` |
| `bg-teal-600` | `bg-[#E8761A]` |
| `bg-teal-700` | `bg-[#E8761A]` |
| `hover:bg-teal-700` | `hover:bg-[#C45F0A]` |
| `hover:bg-teal-800` | `hover:bg-[#C45F0A]` |
| `border-teal-200` | `border-[#E8761A]/30` |
| `focus:border-teal-600` | `focus:border-[#E8761A]` |
| `focus:border-violet-600` | `focus:border-[#E8761A]` |
| `rounded-2xl` | `rounded-xl` |
| `rounded-3xl` | `rounded-xl` |
| `rounded-[1.5rem]` | `rounded-xl` |
| `rounded-[1.75rem]` | `rounded-xl` |
| `border-slate-200` (cards/panels) | `border-[#f0f0f0]` |
| `border-violet-100` (panels) | `border-[#f0f0f0]` |
| `text-slate-950` / `text-slate-900` (titles) | `text-[#1a1a1a]` |
| `bg-violet-50 text-violet-600` (iconCls) | `bg-[#fff5ed] text-[#E8761A]` |

---

## Task 1: `inicio/page.tsx` — Dashboard RH

**Files:**
- Modify: `app/(portal)/empresa/inicio/page.tsx`

- [ ] **Step 1: Add KpiCard and PageHeader imports**

```tsx
// Add these two lines at the top of the file, before the lucide-react import:
import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
```

- [ ] **Step 2: Remove inline KpiCard function**

Delete lines 7–34 (the entire `function KpiCard(...)` block). The `LucideIcon` type import stays because `QuickLink` still uses it.

- [ ] **Step 3: Update RingChart — change teal to orange**

```tsx
// BEFORE:
const color = pct >= 80 ? "#0d9488" : pct >= 50 ? "#f59e0b" : "#f43f5e"

// AFTER:
const color = pct >= 80 ? "#E8761A" : pct >= 50 ? "#f59e0b" : "#f43f5e"
```

- [ ] **Step 4: Update QuickLink component — fix border and hover**

```tsx
// BEFORE (inside function QuickLink, the Link className):
className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-slate-300 hover:shadow-sm"

// AFTER:
className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] bg-white px-4 py-3.5 transition hover:border-[#E8761A]/30 hover:shadow-sm"
```

- [ ] **Step 5: Replace `<header>` with PageHeader**

```tsx
// BEFORE:
<header className="space-y-0.5">
  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
    RH / Empresa
  </p>
  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{empresa.nombre}</h1>
  <p className="text-sm text-slate-400">Panel de operación académica</p>
</header>

// AFTER:
<PageHeader eyebrow="RH / Empresa" title={empresa.nombre} description="Panel de operación académica" />
```

- [ ] **Step 6: Replace KpiCard usages — old props → new API**

```tsx
// BEFORE:
<KpiCard
  label="Paquete activo"
  value={paqueteActivo?.nombre ?? "Sin paquete"}
  sub={`${paqueteActivo?.cursos.length ?? 0} cursos`}
  Icon={Package}
  iconCls="bg-violet-50 text-violet-600"
/>
<KpiCard
  label="Avance promedio"
  value={`${averageProgress}%`}
  sub="Todos los cursos"
  Icon={BarChart3}
  iconCls="bg-teal-50 text-teal-600"
/>
<KpiCard
  label="Empleados activos"
  value={String(empleadosActivos)}
  sub="Accesos vigentes"
  Icon={Users}
  iconCls="bg-blue-50 text-blue-600"
/>
<KpiCard
  label="Constancias emitidas"
  value={String(totalConstancias)}
  sub="Total acumulado"
  Icon={Award}
  iconCls="bg-amber-50 text-amber-600"
/>

// AFTER:
<KpiCard
  label="Paquete activo"
  value={paqueteActivo?.nombre ?? "Sin paquete"}
  sub={`${paqueteActivo?.cursos.length ?? 0} cursos`}
  icon={Package}
  borderColor="amber"
/>
<KpiCard
  label="Avance promedio"
  value={`${averageProgress}%`}
  sub="Todos los cursos"
  icon={BarChart3}
  borderColor="orange"
/>
<KpiCard
  label="Empleados activos"
  value={String(empleadosActivos)}
  sub="Accesos vigentes"
  icon={Users}
  borderColor="charcoal"
/>
<KpiCard
  label="Constancias emitidas"
  value={String(totalConstancias)}
  sub="Total acumulado"
  icon={Award}
  borderColor="green"
/>
```

- [ ] **Step 7: Update QuickLink iconCls props and ring chart card**

```tsx
// BEFORE (QuickLink calls):
<QuickLink href="/empresa/empleados" label="Gestión de empleados" Icon={Users} iconCls="bg-violet-50 text-violet-600" />
<QuickLink href="/empresa/asignaciones" label="Asignación de cursos" Icon={ClipboardList} iconCls="bg-teal-50 text-teal-600" />

// AFTER:
<QuickLink href="/empresa/empleados" label="Gestión de empleados" Icon={Users} iconCls="bg-[#fff5ed] text-[#E8761A]" />
<QuickLink href="/empresa/asignaciones" label="Asignación de cursos" Icon={ClipboardList} iconCls="bg-[#fff5ed] text-[#E8761A]" />

// Ring chart card — BEFORE:
<div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-10 py-6">

// AFTER:
<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#f0f0f0] bg-white px-10 py-6">
```

- [ ] **Step 8: Run TypeScript check**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal
git add "app/(portal)/empresa/inicio/page.tsx"
git commit -m "style(rh): redesign inicio — orange palette, shared KpiCard + PageHeader"
```

---

## Task 2: `empleados/page.tsx` — Gestión de Empleados

**Files:**
- Modify: `app/(portal)/empresa/empleados/page.tsx`

- [ ] **Step 1: Add imports — KpiCard, PageHeader, StatusBadge; remove LucideIcon**

```tsx
// Add at top, before other portal imports:
import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusBadge from "@/components/portal/StatusBadge"

// BEFORE (lucide-react line):
import { AlertCircle, Package, ShieldCheck, Users, UserX, type LucideIcon } from "lucide-react"

// AFTER (LucideIcon no longer needed after KpiCard removal):
import { AlertCircle, Package, ShieldCheck, Users, UserX } from "lucide-react"
```

- [ ] **Step 2: Remove inline KpiCard function (lines 90–117)**

Delete the entire `function KpiCard(...)` block from this file.

- [ ] **Step 3: Replace `<header>` with PageHeader**

```tsx
// BEFORE:
<header className="space-y-0.5">
  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
    RH / Empresa
  </p>
  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Empleados</h1>
</header>

// AFTER:
<PageHeader eyebrow="RH / Empresa" title="Empleados" description="Gestión de la plantilla de colaboradores" />
```

- [ ] **Step 4: Replace KpiCard usages**

```tsx
// BEFORE:
<KpiCard label="Paquete activo" value={paqueteActivo} Icon={Package} iconCls="bg-violet-50 text-violet-600" />
<KpiCard label="Activos" value={String(empleadosActivos)} sub="Con acceso vigente" Icon={Users} iconCls="bg-teal-50 text-teal-600" />
<KpiCard label="Cupos disponibles" value={String(cuposDisponibles)} sub="Antes del límite" Icon={ShieldCheck} iconCls="bg-blue-50 text-blue-600" />
<KpiCard label="Suspendidos" value={String(empleadosInactivos)} Icon={UserX} iconCls="bg-slate-100 text-slate-500" />
<KpiCard label="Con alertas" value={String(employeesWithAccessIssues)} sub="Error de acceso" Icon={AlertCircle} iconCls="bg-amber-50 text-amber-600" />

// AFTER:
<KpiCard label="Paquete activo" value={paqueteActivo} icon={Package} borderColor="amber" />
<KpiCard label="Activos" value={String(empleadosActivos)} sub="Con acceso vigente" icon={Users} borderColor="orange" />
<KpiCard label="Cupos disponibles" value={String(cuposDisponibles)} sub="Antes del límite" icon={ShieldCheck} borderColor="charcoal" />
<KpiCard label="Suspendidos" value={String(empleadosInactivos)} icon={UserX} borderColor="rose" />
<KpiCard label="Con alertas" value={String(employeesWithAccessIssues)} sub="Error de acceso" icon={AlertCircle} borderColor="amber" />
```

- [ ] **Step 5: Fix ManualEmployeeForm — inputs, DC-3 panel, submit button**

All inputs: replace `focus:border-violet-600` with `focus:border-[#E8761A]` throughout `ManualEmployeeForm` and `CsvEmployeeImportForm` (affects 9 input elements total).

DC-3 info panel:
```tsx
// BEFORE:
<div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
  <p className="mb-3 text-sm font-semibold text-violet-950">Datos para constancia DC-3</p>

// AFTER:
<div className="rounded-xl border border-[#f0f0f0] bg-[#f8fafc] p-4">
  <p className="mb-3 text-sm font-semibold text-[#1a1a1a]">Datos para constancia DC-3</p>
```

ManualEmployeeForm submit button:
```tsx
// BEFORE:
className="inline-flex w-fit items-center rounded-full bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800"
// label: "Crear empleado"

// AFTER:
className="inline-flex w-fit items-center rounded-full bg-[#E8761A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C45F0A]"
```

- [ ] **Step 6: Fix CsvEmployeeImportForm — badges, table, submit button**

Required column pill badges (the `flex flex-wrap gap-2` list at top):
```tsx
// BEFORE:
column.required
  ? "border-violet-200 bg-violet-50 text-violet-900"
  : "border-slate-200 bg-slate-50 text-slate-700"

// AFTER:
column.required
  ? "border-[#E8761A]/30 bg-[#fff5ed] text-[#C45F0A]"
  : "border-slate-200 bg-slate-50 text-slate-700"
```

Table header badge (required/opcional label inside `<th>`):
```tsx
// BEFORE:
column.required
  ? "bg-violet-100 text-violet-900"
  : "bg-slate-100 text-slate-600"

// AFTER:
column.required
  ? "bg-[#fff5ed] text-[#C45F0A]"
  : "bg-slate-100 text-slate-600"
```

Legend "Obligatorio" chip inside the preview card:
```tsx
// BEFORE:
<span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-violet-900">
  <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
  Obligatorio
</span>

// AFTER:
<span className="inline-flex items-center gap-1 rounded-full bg-[#fff5ed] px-2.5 py-1 text-[#C45F0A]">
  <span className="h-1.5 w-1.5 rounded-full bg-[#E8761A]" />
  Obligatorio
</span>
```

Table row hover:
```tsx
// BEFORE:
<tr key={row.email} className="transition hover:bg-violet-50/50">
// AFTER:
<tr key={row.email} className="transition hover:bg-[#fff5ed]/40">
```

CSV example card outer container:
```tsx
// BEFORE:
<div className="max-w-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
// AFTER:
<div className="max-w-full overflow-hidden rounded-xl border border-[#f0f0f0] bg-white p-4 shadow-sm">
```

Inner overflow table div:
```tsx
// BEFORE:
<div className="mt-4 max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-inner">
// AFTER:
<div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-[#f0f0f0] bg-white shadow-inner">
```

CsvImportForm submit button:
```tsx
// BEFORE:
className="inline-flex w-fit items-center rounded-full bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800"
// label: "Importar empleados"

// AFTER:
className="inline-flex w-fit items-center rounded-full bg-[#E8761A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C45F0A]"
```

- [ ] **Step 7: Fix employee list section and sync card**

Sync card:
```tsx
// BEFORE:
<div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
// AFTER:
<div className="flex items-center justify-between gap-4 rounded-xl border border-[#f0f0f0] bg-white px-5 py-4">
```

Employee list section wrapper:
```tsx
// BEFORE:
<section className="rounded-2xl border border-slate-200 bg-white p-5">
// AFTER:
<section className="rounded-xl border border-[#f0f0f0] bg-white p-5">
```

Search input:
```tsx
// BEFORE:
className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-violet-600"
// AFTER:
className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#E8761A]"
```

Status select:
```tsx
// BEFORE:
className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-violet-600"
// AFTER:
className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#E8761A]"
```

Both empty-state divs (`No hay empleados...` and `No encontramos...`):
```tsx
// BEFORE:
className="rounded-2xl border border-dashed border-slate-200 ..."
// AFTER:
className="rounded-xl border border-dashed border-slate-200 ..."
```

- [ ] **Step 8: Fix employee row — border, avatar, status badge, action buttons**

Employee row container:
```tsx
// BEFORE:
className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50/50"
// AFTER:
className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] bg-white px-4 py-3 transition hover:bg-slate-50/50"
```

Employee avatar (the active/inactive conditional — keep rose error state, change violet active to orange):
```tsx
// BEFORE:
: empleado.activo
  ? "bg-violet-50 text-violet-700"
  : "bg-slate-100 text-slate-500"

// AFTER:
: empleado.activo
  ? "bg-[#fff5ed] text-[#E8761A]"
  : "bg-slate-100 text-slate-500"
```

Status badge — replace inline `<span>` with StatusBadge:
```tsx
// BEFORE:
<span
  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
    empleado.activo
      ? "bg-teal-100 text-teal-800"
      : "bg-slate-200 text-slate-600"
  }`}
>
  {empleado.activo ? "Activo" : "Suspendido"}
</span>

// AFTER:
<StatusBadge variant={empleado.activo ? "green" : "slate"} dot>
  {empleado.activo ? "Activo" : "Suspendido"}
</StatusBadge>
```

Toggle buttons (Suspender / Reactivar):
```tsx
// BEFORE:
className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
  empleado.activo
    ? "bg-slate-900 text-white hover:bg-slate-700"
    : "bg-violet-700 text-white hover:bg-violet-800"
}`}

// AFTER:
className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
  empleado.activo
    ? "bg-[#1a1a1a] text-white hover:bg-[#333]"
    : "bg-[#E8761A] text-white hover:bg-[#C45F0A]"
}`}
```

- [ ] **Step 9: Run TypeScript check**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal
git add "app/(portal)/empresa/empleados/page.tsx"
git commit -m "style(rh): redesign empleados — orange palette, shared KpiCard + StatusBadge"
```

---

## Task 3: `asignaciones/page.tsx` — Asignación de Cursos

**Files:**
- Modify: `app/(portal)/empresa/asignaciones/page.tsx`

- [ ] **Step 1: Add imports; remove LucideIcon**

```tsx
// Add before the lucide-react import:
import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"

// BEFORE (lucide-react):
import { BookOpen, Package, Users, type LucideIcon } from "lucide-react"
// AFTER (LucideIcon only used by inline KpiCard, now removed):
import { BookOpen, Package, Users } from "lucide-react"
```

- [ ] **Step 2: Remove inline KpiCard function (lines 42–69)**

Delete the `function KpiCard(...)` block. Keep `getInitials` (lines 71–77) — it's used at line 161.

- [ ] **Step 3: Replace `<header>` with PageHeader**

```tsx
// BEFORE:
<header className="space-y-0.5">
  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
    RH / Empresa
  </p>
  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
    Asignación de cursos
  </h1>
</header>

// AFTER:
<PageHeader eyebrow="RH / Empresa" title="Asignación de cursos" description="Asigna cursos del paquete activo a cada colaborador" />
```

- [ ] **Step 4: Replace KpiCard usages**

```tsx
// BEFORE:
<KpiCard label="Paquete activo" value={activePackage?.nombre ?? "Sin paquete"} sub="Catálogo disponible" Icon={Package} iconCls="bg-violet-50 text-violet-600" />
<KpiCard label="Cursos disponibles" value={String(packageCourses.length)} sub="Para asignar a empleados" Icon={BookOpen} iconCls="bg-teal-50 text-teal-600" />
<KpiCard label="Empleados activos" value={String(empleados.length)} sub="Elegibles para asignación" Icon={Users} iconCls="bg-blue-50 text-blue-600" />

// AFTER:
<KpiCard label="Paquete activo" value={activePackage?.nombre ?? "Sin paquete"} sub="Catálogo disponible" icon={Package} borderColor="amber" />
<KpiCard label="Cursos disponibles" value={String(packageCourses.length)} sub="Para asignar a empleados" icon={BookOpen} borderColor="orange" />
<KpiCard label="Empleados activos" value={String(empleados.length)} sub="Elegibles para asignación" icon={Users} borderColor="charcoal" />
```

- [ ] **Step 5: Fix employee article cards, avatar, save button**

Article container:
```tsx
// BEFORE:
<article key={empleado.id} className="rounded-2xl border border-slate-200 bg-white p-5">
// AFTER:
<article key={empleado.id} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
```

Employee avatar:
```tsx
// BEFORE:
<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-700">
// AFTER:
<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff5ed] text-xs font-bold text-[#E8761A]">
```

Save button:
```tsx
// BEFORE:
<button type="submit" className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800">
  Guardar
</button>

// AFTER:
<button type="submit" className="rounded-full bg-[#E8761A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#C45F0A]">
  Guardar
</button>
```

- [ ] **Step 6: Fix course checkbox cards**

Course label container (hover and border):
```tsx
// BEFORE:
className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white transition hover:border-violet-200 hover:bg-violet-50/30"
// AFTER:
className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#f0f0f0] bg-white transition hover:border-[#E8761A]/30 hover:bg-[#fff5ed]/30"
```

Course thumbnail placeholder (no-image fallback):
```tsx
// BEFORE:
<div className="flex h-[60px] w-[107px] shrink-0 items-center justify-center rounded-l-xl bg-violet-50">
  <span className="text-lg font-bold text-violet-300">
// AFTER:
<div className="flex h-[60px] w-[107px] shrink-0 items-center justify-center rounded-l-xl bg-[#fff5ed]">
  <span className="text-lg font-bold text-[#E8761A]/30">
```

Empty state (no employees):
```tsx
// BEFORE:
<div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
// AFTER:
<div className="rounded-xl border border-dashed border-[#f0f0f0] bg-white px-4 py-8 text-center text-sm text-slate-500">
```

- [ ] **Step 7: Run TypeScript check**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal
git add "app/(portal)/empresa/asignaciones/page.tsx"
git commit -m "style(rh): redesign asignaciones — orange palette, shared KpiCard + PageHeader"
```

---

## Task 4: `progreso/page.tsx` — Progreso del Equipo

**Files:**
- Modify: `app/(portal)/empresa/progreso/page.tsx`

- [ ] **Step 1: Add imports; remove LucideIcon**

```tsx
// Add before lucide-react import:
import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusBadge from "@/components/portal/StatusBadge"

// BEFORE:
import { AlertCircle, BarChart3, BookOpen, CheckCircle, type LucideIcon } from "lucide-react"
// AFTER:
import { AlertCircle, BarChart3, BookOpen, CheckCircle } from "lucide-react"
```

- [ ] **Step 2: Remove inline KpiCard function (lines 7–34)**

Delete the `function KpiCard(...)` block. Keep `getInitials` (lines 36–42).

- [ ] **Step 3: Replace `<header>` with PageHeader**

```tsx
// BEFORE:
<header className="space-y-0.5">
  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
    RH / Empresa
  </p>
  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Progreso</h1>
</header>

// AFTER:
<PageHeader eyebrow="RH / Empresa" title="Progreso" description="Avance y actividad de cursos por colaborador" />
```

- [ ] **Step 4: Replace KpiCard usages**

```tsx
// BEFORE:
<KpiCard label="Avance promedio" value={`${averageProgress}%`} sub="Todos los cursos" Icon={BarChart3} iconCls="bg-violet-50 text-violet-600" />
<KpiCard label="Con rezago" value={String(employeesWithDelay)} sub="Avance < 25% o con error" Icon={AlertCircle} iconCls="bg-amber-50 text-amber-600" />
<KpiCard label="Cursos iniciados" value={String(startedCourses)} sub="Con actividad real" Icon={BookOpen} iconCls="bg-teal-50 text-teal-600" />
<KpiCard label="Cursos completados" value={String(completedCourses)} sub="Cerrados por empleados" Icon={CheckCircle} iconCls="bg-blue-50 text-blue-600" />

// AFTER:
<KpiCard label="Avance promedio" value={`${averageProgress}%`} sub="Todos los cursos" icon={BarChart3} borderColor="orange" />
<KpiCard label="Con rezago" value={String(employeesWithDelay)} sub="Avance < 25% o con error" icon={AlertCircle} borderColor="amber" />
<KpiCard label="Cursos iniciados" value={String(startedCourses)} sub="Con actividad real" icon={BookOpen} borderColor="charcoal" />
<KpiCard label="Cursos completados" value={String(completedCourses)} sub="Cerrados por empleados" icon={CheckCircle} borderColor="green" />
```

- [ ] **Step 5: Fix employee cards — bar color, avatar, status badge**

Bar color (inside `empleados.map`):
```tsx
// BEFORE:
const barColor =
  errors > 0
    ? "bg-rose-500"
    : avg >= 75
      ? "bg-teal-600"
      : avg > 0
        ? "bg-amber-500"
        : "bg-slate-300"

// AFTER:
const barColor =
  errors > 0
    ? "bg-rose-500"
    : avg >= 75
      ? "bg-[#E8761A]"
      : avg > 0
        ? "bg-amber-500"
        : "bg-slate-300"
```

Replace `statusColor` variable with `statusVariant` for StatusBadge, and update the badge JSX:
```tsx
// BEFORE (statusColor variable + span):
const statusColor =
  errors > 0
    ? "bg-rose-100 text-rose-800"
    : avg >= 75
      ? "bg-teal-100 text-teal-800"
      : avg > 0
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600"

// ... later in JSX:
<span
  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}
>
  {statusLabel}
</span>

// AFTER (add statusVariant, remove statusColor):
const statusVariant: "red" | "green" | "amber" | "slate" =
  errors > 0
    ? "red"
    : avg >= 75
      ? "green"
      : avg > 0
        ? "amber"
        : "slate"

// ... in JSX:
<StatusBadge variant={statusVariant}>
  {statusLabel}
</StatusBadge>
```

Employee avatar:
```tsx
// BEFORE:
className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
  errors > 0
    ? "bg-rose-100 text-rose-700"
    : "bg-violet-100 text-violet-700"
}`}

// AFTER:
className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
  errors > 0
    ? "bg-rose-100 text-rose-700"
    : "bg-[#fff5ed] text-[#E8761A]"
}`}
```

- [ ] **Step 6: Fix course summary section**

Course thumbnail placeholder:
```tsx
// BEFORE:
<div className="flex h-[56px] items-center justify-center bg-teal-50">
  <span className="text-xl font-bold text-teal-200">

// AFTER:
<div className="flex h-[56px] items-center justify-center bg-[#fff5ed]">
  <span className="text-xl font-bold text-[#E8761A]/20">
```

Course progress bar (inside `courseSummaries.map`):
```tsx
// BEFORE:
<div className="h-full rounded-full bg-teal-600" style={{ width: `${course.averageProgress}%` }} />
// AFTER:
<div className="h-full rounded-full bg-[#E8761A]" style={{ width: `${course.averageProgress}%` }} />
```

Completados text:
```tsx
// BEFORE:
<span className="text-teal-700">{course.completed} completados</span>
// AFTER:
<span className="text-[#E8761A]">{course.completed} completados</span>
```

- [ ] **Step 7: Fix all containers (rounded-2xl → rounded-xl)**

Both section elements in the grid (employee section + course section):
```tsx
// BEFORE:
className="rounded-2xl border border-slate-200 bg-white p-5"
// AFTER:
className="rounded-xl border border-[#f0f0f0] bg-white p-5"
```

Employee card containers (inside `empleados.map`):
```tsx
// BEFORE:
className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
// AFTER:
className="rounded-xl border border-[#f0f0f0] bg-slate-50/40 p-4"
```

Course card containers (inside `courseSummaries.map`):
```tsx
// BEFORE:
<div key={course.courseId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
// AFTER:
<div key={course.courseId} className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
```

Both empty state divs:
```tsx
// BEFORE:
className="rounded-2xl border border-dashed border-slate-200 ..."
// AFTER:
className="rounded-xl border border-dashed border-[#f0f0f0] ..."
```

- [ ] **Step 8: Run TypeScript check**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal
git add "app/(portal)/empresa/progreso/page.tsx"
git commit -m "style(rh): redesign progreso — orange palette, shared KpiCard + StatusBadge"
```

---

## Task 5: `constancias/page.tsx` — Constancias DC-3

**Files:**
- Modify: `app/(portal)/empresa/constancias/page.tsx`

- [ ] **Step 1: Add imports; remove LucideIcon**

```tsx
// Add before lucide-react import:
import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusBadge from "@/components/portal/StatusBadge"

// BEFORE:
import { Award, Clock, FileText, Users, type LucideIcon } from "lucide-react"
// AFTER:
import { Award, Clock, FileText, Users } from "lucide-react"
```

- [ ] **Step 2: Remove inline KpiCard function (lines 49–76)**

Delete the `function KpiCard(...)` block. Keep `getInitials` (lines 78–84).

- [ ] **Step 3: Replace `<header>` with PageHeader**

```tsx
// BEFORE:
<header className="space-y-0.5">
  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
    RH / Empresa
  </p>
  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Constancias DC-3</h1>
</header>

// AFTER:
<PageHeader eyebrow="RH / Empresa" title="Constancias DC-3" description="Constancias de habilidades laborales para cumplimiento STPS" />
```

- [ ] **Step 4: Replace KpiCard usages**

```tsx
// BEFORE:
<KpiCard label="Constancias emitidas" value={String(constancias.length)} sub="Total registradas" Icon={Award} iconCls="bg-teal-50 text-teal-600" />
<KpiCard label="Empleados con constancia" value={String(employeesWithCertificates)} sub="Al menos una emitida" Icon={Users} iconCls="bg-violet-50 text-violet-600" />
<KpiCard label="Pendientes" value={String(pendingCertificates.length)} sub="Cursos sin constancia aún" Icon={Clock} iconCls="bg-amber-50 text-amber-600" />
<KpiCard
  label="Última emisión"
  value={latestCertificate ? formatDateTime(latestCertificate.fecha_emision) : "Sin constancias"}
  Icon={FileText}
  iconCls="bg-slate-100 text-slate-500"
/>

// AFTER:
<KpiCard label="Constancias emitidas" value={String(constancias.length)} sub="Total registradas" icon={Award} borderColor="orange" />
<KpiCard label="Empleados con constancia" value={String(employeesWithCertificates)} sub="Al menos una emitida" icon={Users} borderColor="charcoal" />
<KpiCard label="Pendientes" value={String(pendingCertificates.length)} sub="Cursos sin constancia aún" icon={Clock} borderColor="amber" />
<KpiCard
  label="Última emisión"
  value={latestCertificate ? formatDateTime(latestCertificate.fecha_emision) : "Sin constancias"}
  icon={FileText}
  borderColor="charcoal"
/>
```

- [ ] **Step 5: Fix Dc3Preview component**

```tsx
// BEFORE:
<div className="overflow-hidden rounded-2xl border border-teal-200 bg-white">
  <div className="bg-teal-600 px-5 py-3 text-center">
    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-teal-200">
      Secretaría del Trabajo y Previsión Social
    </p>
    <p className="text-sm font-bold text-white">Constancia de Habilidades Laborales</p>
    <p className="text-[10px] text-teal-200">DC-3 Oficial STPS</p>
  </div>
  ...
  <a
    href={`/api/constancias/${constancia.id}/dc3`}
    target="_blank"
    rel="noreferrer"
    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
  >

// AFTER:
<div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
  <div className="bg-[#E8761A] px-5 py-3 text-center">
    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/70">
      Secretaría del Trabajo y Previsión Social
    </p>
    <p className="text-sm font-bold text-white">Constancia de Habilidades Laborales</p>
    <p className="text-[10px] text-white/70">DC-3 Oficial STPS</p>
  </div>
  ...
  <a
    href={`/api/constancias/${constancia.id}/dc3`}
    target="_blank"
    rel="noreferrer"
    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8761A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C45F0A]"
  >
```

- [ ] **Step 6: Fix constancia row list**

Both section containers:
```tsx
// BEFORE:
<section className="rounded-2xl border border-slate-200 bg-white p-5">
// AFTER:
<section className="rounded-xl border border-[#f0f0f0] bg-white p-5">
```

Constancia row:
```tsx
// BEFORE:
className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50/50"
// AFTER:
className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] bg-white px-4 py-3 transition hover:bg-slate-50/50"
```

Constancia row avatar:
```tsx
// BEFORE:
<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xs font-bold text-teal-700">
// AFTER:
<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff5ed] text-xs font-bold text-[#E8761A]">
```

DC-3 download button (in row):
```tsx
// BEFORE:
className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
// AFTER:
className="rounded-full bg-[#E8761A] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#C45F0A]"
```

Pending item row:
```tsx
// BEFORE:
className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3"
// AFTER:
className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3"
```

Empty state "Aún no hay constancias":
```tsx
// BEFORE:
<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
// AFTER:
<div className="rounded-xl border border-dashed border-[#f0f0f0] bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
```

"No hay pendientes" success state:
```tsx
// BEFORE:
<div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50 px-4 py-5 text-center text-sm text-teal-800">
// AFTER:
<div className="rounded-xl border border-dashed border-[#f0f0f0] bg-[#f8fafc] px-4 py-5 text-center text-sm text-[#64748b]">
```

Side panel empty:
```tsx
// BEFORE:
<div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
// AFTER:
<div className="rounded-xl border border-dashed border-[#f0f0f0] bg-white px-5 py-8 text-center text-sm text-slate-400">
```

- [ ] **Step 7: Run TypeScript check**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal
git add "app/(portal)/empresa/constancias/page.tsx"
git commit -m "style(rh): redesign constancias — orange palette, shared KpiCard + StatusBadge"
```

---

## Task 6: Final Verification

**Files:** all 5 pages

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Grep for forbidden patterns**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal
grep -n "text-teal-\|bg-teal-\|rounded-2xl\|rounded-3xl\|linear-gradient\|bg-gradient" \
  "app/(portal)/empresa/inicio/page.tsx" \
  "app/(portal)/empresa/empleados/page.tsx" \
  "app/(portal)/empresa/asignaciones/page.tsx" \
  "app/(portal)/empresa/progreso/page.tsx" \
  "app/(portal)/empresa/constancias/page.tsx"
```

Expected: no output.

- [ ] **Step 3: Grep for remaining violet interactive elements**

```bash
cd /Users/luffino/Desktop/System-Desarrolla360/desarrolla360-portal
grep -n "bg-violet\|text-violet\|border-violet\|focus:border-violet" \
  "app/(portal)/empresa/inicio/page.tsx" \
  "app/(portal)/empresa/empleados/page.tsx" \
  "app/(portal)/empresa/asignaciones/page.tsx" \
  "app/(portal)/empresa/progreso/page.tsx" \
  "app/(portal)/empresa/constancias/page.tsx"
```

Expected: only decorative CSV table legend refs (acceptable) — no interactive elements, buttons, inputs, panels, or badges.

- [ ] **Step 4: Verify acceptance criteria are met**

All of the following must be true:
- No `text-teal-*` / `bg-teal-*` in any of the 5 files
- No `rounded-2xl` or `rounded-3xl` in any of the 5 files
- No `linear-gradient` or `bg-gradient-*` anywhere
- `StatusBadge variant="green"` for Activo/Completado states
- `StatusBadge variant="slate"` for Suspendido/Sin iniciar states
- `StatusBadge variant="amber"` for En progreso states
- Primary CTA buttons use `bg-[#E8761A] hover:bg-[#C45F0A]`
- Inputs/selects use `focus:border-[#E8761A]`
- All KpiCards use shared component with `borderColor` prop
- All headers use shared `PageHeader` with orange eyebrow
