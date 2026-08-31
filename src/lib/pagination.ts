export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return { items: pageItems, currentPage, totalPages, totalResults: items.length }
}
