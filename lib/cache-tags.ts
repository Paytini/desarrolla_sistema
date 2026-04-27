const SUPERADMIN_CACHE_PREFIX = "d360:dashboard:superadmin"
const EMPRESA_CACHE_PREFIX = "d360:dashboard:empresa"

export const SUPERADMIN_GLOBAL_TAG = `${SUPERADMIN_CACHE_PREFIX}:all`
export const SUPERADMIN_REPORTES_TAG = `${SUPERADMIN_CACHE_PREFIX}:reportes`
export const SUPERADMIN_EMPRESAS_TAG = `${SUPERADMIN_CACHE_PREFIX}:empresas`
export const SUPERADMIN_PAQUETES_TAG = `${SUPERADMIN_CACHE_PREFIX}:paquetes`
export const SUPERADMIN_ACCESOS_TAG = `${SUPERADMIN_CACHE_PREFIX}:accesos`

export const SUPERADMIN_DASHBOARD_TAGS = [
  SUPERADMIN_GLOBAL_TAG,
  SUPERADMIN_REPORTES_TAG,
  SUPERADMIN_EMPRESAS_TAG,
  SUPERADMIN_PAQUETES_TAG,
  SUPERADMIN_ACCESOS_TAG,
] as const

export function empresaCacheRootTag(empresaId: number) {
  return `${EMPRESA_CACHE_PREFIX}:${empresaId}`
}

export function empresaEmpleadosTag(empresaId: number) {
  return `${empresaCacheRootTag(empresaId)}:empleados`
}

export function empresaAsignacionesTag(empresaId: number) {
  return `${empresaCacheRootTag(empresaId)}:asignaciones`
}

export function getEmpresaDashboardTags(empresaId: number) {
  return [
    empresaCacheRootTag(empresaId),
    empresaEmpleadosTag(empresaId),
    empresaAsignacionesTag(empresaId),
  ] as const
}
