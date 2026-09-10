export type ImageValidationResult = { ok: true } | { ok: false; error: string }

export function validateImageFile(
  file: File,
  opts: { accept: string[]; maxSizeBytes: number },
): ImageValidationResult {
  if (!opts.accept.includes(file.type)) {
    const formats = opts.accept
      .map((type) => type.split("/")[1]?.toUpperCase())
      .filter(Boolean)
      .join(", ")
    return { ok: false, error: `Formato no válido. Usa ${formats}.` }
  }

  if (file.size > opts.maxSizeBytes) {
    const mb = Math.round(opts.maxSizeBytes / (1024 * 1024))
    return { ok: false, error: `El archivo supera el límite de ${mb} MB.` }
  }

  return { ok: true }
}
