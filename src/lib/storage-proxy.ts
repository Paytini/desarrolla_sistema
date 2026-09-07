// Los archivos de este app se suben a un bucket privado de Supabase Storage,
// así que solo se pueden mostrar a través del proxy autenticado en
// /api/upload/signature-proxy.
//
// Este módulo se importa desde componentes de cliente, así que no puede depender
// de supabase-storage.ts (server-only: usa la service role key) ni leer
// SUPABASE_URL (no está disponible en el bundle del navegador). Detectamos las
// URLs de Storage por la ruta del objeto, que es estable para el bucket privado.
const SUPABASE_STORAGE_OBJECT_PATH = "/storage/v1/object/portal-files/"

export function storageProxyUrl(url: string): string {
  return url.includes(SUPABASE_STORAGE_OBJECT_PATH)
    ? `/api/upload/signature-proxy?url=${encodeURIComponent(url)}`
    : url
}
