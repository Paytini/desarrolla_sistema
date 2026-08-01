// Builds a path under the RH company portal, e.g. companyPath("acme", "/employees") -> "/company/acme/employees"
export function companyPath(slug: string, subpath: string = ""): string {
  const normalized = subpath.startsWith("/") ? subpath : subpath ? `/${subpath}` : ""
  return `/company/${slug}${normalized}`
}
