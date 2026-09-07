import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const STORAGE_BUCKET = "portal-files"

let client: SupabaseClient | null = null

// El cliente se crea la primera vez que hace falta, no al importar este modulo:
// createClient() valida SUPABASE_URL de inmediato, y este archivo se importa en
// contextos (como la recoleccion de config de rutas en el build de Next.js) donde
// esas variables no siempre estan disponibles aunque nunca se vaya a subir/bajar
// nada de Storage.
function getClient() {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } },
    )
  }
  return client
}

export const OBJECT_PATH = `/storage/v1/object/${STORAGE_BUCKET}/`

function objectUrlPrefix() {
  const baseUrl = process.env.SUPABASE_URL

  if (!baseUrl) {
    throw new Error("Falta la variable SUPABASE_URL para construir la URL del archivo")
  }

  return `${baseUrl.replace(/\/$/, "")}${OBJECT_PATH}`
}

export async function uploadPrivateFile(path: string, data: Buffer, contentType: string) {
  const { error } = await getClient()
    .storage.from(STORAGE_BUCKET)
    .upload(path, data, { contentType, upsert: true })

  if (error) {
    throw new Error(`No se pudo subir el archivo a Supabase Storage: ${error.message}`)
  }

  return objectUrlPrefix() + path
}

// Solo servidor: compara contra el prefijo completo, con host incluido, porque de
// esta funcion depende que /api/upload/signature-proxy no descargue rutas ajenas.
export function isSupabaseStorageUrl(url: string | null | undefined) {
  return typeof url === "string" && url.startsWith(objectUrlPrefix())
}

export async function downloadPrivateFile(path: string) {
  const { data, error } = await getClient().storage.from(STORAGE_BUCKET).download(path)

  if (error) {
    throw new Error(`No se pudo leer el archivo de Supabase Storage: ${error.message}`)
  }

  return Buffer.from(await data.arrayBuffer())
}

export function storagePathFromUrl(url: string) {
  if (!isSupabaseStorageUrl(url)) {
    throw new Error("La URL no pertenece al bucket privado de Supabase Storage")
  }

  return url.slice(objectUrlPrefix().length)
}
