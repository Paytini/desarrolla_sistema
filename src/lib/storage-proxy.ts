import { OBJECT_PATH } from "@/lib/supabase-storage"

// Los archivos de este app se suben a un bucket privado de Supabase Storage,
// así que solo se pueden mostrar a través del proxy autenticado en
// /api/upload/signature-proxy.
//
// Esta funcion tambien corre en el navegador, donde SUPABASE_URL no existe, asi
// que aqui solo se mira la forma de la URL para decidir si vale la pena pasarla
// por el proxy. Quien valida el host es el propio proxy, en el servidor.
export function storageProxyUrl(url: string): string {
  return url.includes(OBJECT_PATH)
    ? `/api/upload/signature-proxy?url=${encodeURIComponent(url)}`
    : url
}
