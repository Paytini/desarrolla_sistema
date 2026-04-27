export type SearchParamsRecord = Record<string, string | string[] | undefined> | undefined

export function readSearchParam(params: SearchParamsRecord, key: string) {
  const value = params?.[key]
  return Array.isArray(value) ? value[0] : value
}

export function readDecodedSearchParam(params: SearchParamsRecord, key: string) {
  const value = readSearchParam(params, key)
  if (!value) {
    return value
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
