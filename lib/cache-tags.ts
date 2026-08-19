const SUPERADMIN_CACHE_PREFIX = "d360:dashboard:superadmin"
const COMPANY_CACHE_PREFIX = "d360:dashboard:empresa"

export const SUPERADMIN_GLOBAL_TAG = `${SUPERADMIN_CACHE_PREFIX}:all`
export const SUPERADMIN_REPORTS_TAG = `${SUPERADMIN_CACHE_PREFIX}:reportes`
export const SUPERADMIN_COMPANIES_TAG = `${SUPERADMIN_CACHE_PREFIX}:empresas`
export const SUPERADMIN_PACKAGES_TAG = `${SUPERADMIN_CACHE_PREFIX}:paquetes`
export const SUPERADMIN_ACCESS_TAG = `${SUPERADMIN_CACHE_PREFIX}:accesos`
export const SUPERADMIN_DC3_TAG = `${SUPERADMIN_CACHE_PREFIX}:dc3`

export const SUPERADMIN_DASHBOARD_TAGS = [
  SUPERADMIN_GLOBAL_TAG,
  SUPERADMIN_REPORTS_TAG,
  SUPERADMIN_COMPANIES_TAG,
  SUPERADMIN_PACKAGES_TAG,
  SUPERADMIN_ACCESS_TAG,
  SUPERADMIN_DC3_TAG,
] as const

export function companyCacheRootTag(companyId: string) {
  return `${COMPANY_CACHE_PREFIX}:${companyId}`
}

export function companyEmployeesTag(companyId: string) {
  return `${companyCacheRootTag(companyId)}:empleados`
}

export function companyAssignmentsTag(companyId: string) {
  return `${companyCacheRootTag(companyId)}:asignaciones`
}

export function getCompanyDashboardTags(companyId: string) {
  return [
    companyCacheRootTag(companyId),
    companyEmployeesTag(companyId),
    companyAssignmentsTag(companyId),
  ] as const
}
