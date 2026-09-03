import { isSupabaseStorageUrl } from "@/lib/supabase-storage"

// Los archivos de este app se suben a un bucket privado de Supabase Storage,
// así que solo se pueden mostrar a través del proxy autenticado en
// /api/upload/signature-proxy.
export function storageProxyUrl(url: string): string {
  return isSupabaseStorageUrl(url)
    ? `/api/upload/signature-proxy?url=${encodeURIComponent(url)}`
    : url
}
