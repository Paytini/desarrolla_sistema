# Portal RH — Rediseño Visual (Sub-proyecto 1)

## Goal

Actualizar la capa visual de las 5 páginas del portal RH (`/empresa`) para que sean consistentes con el nuevo sistema de diseño implementado en el SuperAdmin: paleta naranja/blanco/charcoal, DM Sans, componentes compartidos. Cero cambios a lógica de negocio.

---

## Alcance

### Páginas afectadas
- `app/(portal)/empresa/inicio/page.tsx` — Dashboard RH
- `app/(portal)/empresa/empleados/page.tsx` — Gestión de empleados
- `app/(portal)/empresa/asignaciones/page.tsx` — Asignación de cursos
- `app/(portal)/empresa/progreso/page.tsx` — Progreso del equipo
- `app/(portal)/empresa/constancias/page.tsx` — Constancias DC-3

### Fuera de alcance
- Lógica de datos, Server Actions, queries Prisma
- Componentes especializados: `EmployeeOnboardingTabs`, `CnoSelect`, `DeleteEmployeeButton`
- Páginas de EMPLEADO (`/empleado/*`) — son Sub-proyecto 2
- Páginas de SUPERADMIN — ya actualizadas

---

## Sistema visual

### Sustituciones globales (aplican a las 5 páginas)

| Patrón a buscar | Reemplazar por |
|---|---|
| `text-teal-600` | `text-[#E8761A]` |
| `text-teal-700` | `text-[#C45F0A]` |
| `text-teal-800` | `text-[#C45F0A]` |
| `bg-teal-50` | `bg-[#fff5ed]` |
| `bg-teal-100` | `bg-[#fff5ed]` |
| `bg-teal-600` | `bg-[#E8761A]` |
| `bg-teal-700` | `bg-[#E8761A]` |
| `hover:bg-teal-700` | `hover:bg-[#C45F0A]` |
| `hover:bg-teal-800` | `hover:bg-[#C45F0A]` |
| `border-teal-600` | `border-[#E8761A]` |
| `border-teal-200` | `border-[#E8761A]/30` |
| `focus:border-teal-600` | `focus:border-[#E8761A]` |
| `focus:border-violet-600` | `focus:border-[#E8761A]` |
| `ring-teal-100` | `ring-[#fff5ed]` |
| `ring-teal-200` | `ring-[#E8761A]/30` |
| `accent="teal"` | `accent="orange"` |
| `accent="violet"` | `accent="slate"` |
| `rounded-2xl` | `rounded-xl` |
| `rounded-3xl` | `rounded-xl` |
| `rounded-[1.75rem]` | `rounded-xl` |
| `border-slate-200` (en cards/panels) | `border-[#f0f0f0]` |
| `border-violet-100` (en panels) | `border-[#f0f0f0]` |

### Colores de textos

| Patrón | Reemplazar |
|---|---|
| `text-slate-950` / `text-slate-900` (títulos) | `text-[#1a1a1a]` |
| `text-slate-500` / `text-slate-400` (secundario) | `text-[#64748b]` o `text-[#94a3b8]` |
| `bg-violet-50 text-violet-600` (iconCls) | `bg-[#fff5ed] text-[#E8761A]` |

---

## Cambios específicos por página

### 1. `inicio/page.tsx`

**Eliminar:** función `KpiCard` inline (líneas 7–34) y función `RingChart` inline.
**Importar:** `KpiCard` desde `@/components/portal/KpiCard`, `PageHeader` desde `@/components/portal/PageHeader`.

**`RingChart`:** actualizar color normal de `#0d9488` a `#E8761A`. El componente es pequeño — mantenerlo inline está bien, solo cambiar el color.

**Header:** reemplazar el `<header>` inline con `<PageHeader eyebrow="RH / Empresa" title={empresa.nombre} description="Panel de operación académica" />`.

**KpiCards:** cambiar props `iconCls` de `"bg-teal-50 text-teal-600"` a `"bg-[#fff5ed] text-[#E8761A]"`. El prop `Icon` pasa a `icon` (lowercase) al usar el KpiCard compartido.

**QuickLinks:** `rounded-2xl border-slate-200` → `rounded-xl border-[#f0f0f0]`. El `<ChevronRight>` ya está con `text-slate-400` — mantener.

**Ring chart card:** `rounded-2xl border-slate-200` → `rounded-xl border-[#f0f0f0]`.

### 2. `empleados/page.tsx`

**Eliminar:** función `KpiCard` inline.
**Importar:** `KpiCard` desde `@/components/portal/KpiCard`, `StatusBadge` desde `@/components/portal/StatusBadge`.

**KpiCards:** misma conversión que en inicio. Usar `borderColor` apropiado:
- Empleados activos → `borderColor="orange"`
- Cupos disponibles → `borderColor="charcoal"`
- Con paquete asignado → `borderColor="amber"`
- Suspendidos → `borderColor="rose"`

**Lista de empleados:** añadir `StatusBadge` para estado activo/suspendido:
```tsx
<StatusBadge variant={empleado.activo ? "green" : "slate"} dot>
  {empleado.activo ? "Activo" : "Suspendido"}
</StatusBadge>
```

**Botones de acción:** 
- Suspender → `bg-[#1a1a1a] text-white hover:bg-[#333]`
- Reactivar → `bg-[#E8761A] text-white hover:bg-[#C45F0A]`
- Eliminar → `bg-rose-500 text-white hover:bg-rose-600` (no cambia)

**Panel violet de aviso:** `border-violet-100 bg-violet-50/50` → `border-[#f0f0f0] bg-[#f8fafc]`.

**Tabla overflow:** `rounded-2xl` → `rounded-xl`.

### 3. `asignaciones/page.tsx`

**Eliminar:** función `KpiCard` inline.
**Importar:** `KpiCard` desde `@/components/portal/KpiCard`, `PageHeader` desde `@/components/portal/PageHeader`.

**KpiCards:** misma conversión. `iconCls` → `borderColor`.

**Formulario de asignación:**
- Inputs: `focus:border-teal-600` → `focus:border-[#E8761A]`
- Checkboxes de cursos: el highlight de selección activo → `bg-[#fff5ed] border-[#E8761A]`
- Botón "Guardar asignación": `bg-teal-700 hover:bg-teal-800` → `bg-[#E8761A] hover:bg-[#C45F0A]`

### 4. `progreso/page.tsx`

**Eliminar:** función `KpiCard` inline.
**Importar:** `KpiCard` desde `@/components/portal/KpiCard`, `PageHeader` desde `@/components/portal/PageHeader`, `StatusBadge` desde `@/components/portal/StatusBadge`.

**KpiCards:** conversión estándar.

**Barras de progreso:** `bg-teal-600` → `bg-[#E8761A]`. La barra condicional:
```tsx
// Antes:
const barColor = completado ? "bg-teal-600" : "bg-violet-500"
// Después:
const barColor = completado ? "bg-[#E8761A]" : "bg-[#94a3b8]"
```

**Avatares de empleado:** `bg-teal-600 text-white` → `bg-[#E8761A] text-white`.

**Badges de estado de curso:** añadir `StatusBadge`:
- Completado → `variant="green"`
- En progreso → `variant="amber"`
- Sin iniciar → `variant="slate"`

### 5. `constancias/page.tsx`

**Eliminar:** función `KpiCard` inline.
**Importar:** `KpiCard` desde `@/components/portal/KpiCard`, `PageHeader` desde `@/components/portal/PageHeader`, `StatusBadge` desde `@/components/portal/StatusBadge`.

**KpiCards:** conversión estándar. Sugerencia de `borderColor`:
- Total emitidas → `orange`
- Pendientes de emitir → `amber`
- Cursos completados → `green`
- Empleados con constancias → `charcoal`

**Tabla de constancias:** `rounded-2xl border-slate-200` → `rounded-xl border-[#f0f0f0]`.

**Botón de descarga individual:** `bg-teal-700` → `bg-[#E8761A]`. Botón de descarga ZIP → mantener mismo patrón.

**Badge de estado de curso en tabla:**
```tsx
<StatusBadge variant={constancia ? "green" : "slate"}>
  {constancia ? "Emitida" : "Pendiente"}
</StatusBadge>
```

---

## Componentes compartidos usados

Todos ya existen — no se crean nuevos:

| Componente | Ruta | Uso en RH |
|---|---|---|
| `KpiCard` | `components/portal/KpiCard` | Reemplaza las 5 funciones inline |
| `StatusBadge` | `components/portal/StatusBadge` | Estado empleados, cursos, constancias |
| `PageHeader` | `components/portal/PageHeader` | Estandariza cabecera en todas las páginas |

---

## Restricciones de estilo

- **Sin gradientes** — ningún `background: linear-gradient(...)` ni `bg-gradient-*` en ninguna de las 5 páginas. Los fondos de secciones, banners y cards usan colores sólidos (`#E8761A`, `#f8fafc`, `white`, etc.).

---

## Criterios de aceptación

- `npx tsc --noEmit` sin errores tras los cambios
- Ningún `text-teal-*`, `bg-teal-*`, `rounded-2xl`, `rounded-3xl` en las 5 páginas
- `StatusBadge` verde para estados "activo/completado", slate para "suspendido/sin iniciar", ámbar para "en progreso"
- Botones primarios CTA: `bg-[#E8761A] hover:bg-[#C45F0A]`
- Inputs/selects con `focus:border-[#E8761A]`
- KpiCard con borde izquierdo semántico en todas las páginas
- Server Actions y lógica de datos sin ningún cambio
