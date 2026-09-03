import { createClient } from "@supabase/supabase-js"

const STORAGE_BUCKET = "portal-files"

const client = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } },
)

function objectUrlPrefix() {
  return `${(process.env.SUPABASE_URL as string).replace(/\/$/, "")}/storage/v1/object/${STORAGE_BUCKET}/`
}

export async function uploadPrivateFile(path: string, data: Buffer, contentType: string) {
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, data, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw new Error(`No se pudo subir el archivo a Supabase Storage: ${error.message}`)
  }

  return objectUrlPrefix() + path
}

export function isSupabaseStorageUrl(url: string) {
  return url.startsWith(objectUrlPrefix())
}

export async function downloadPrivateFile(path: string) {
  const { data, error } = await client.storage.from(STORAGE_BUCKET).download(path)

  if (error) {
    throw new Error(`No se pudo leer el archivo de Supabase Storage: ${error.message}`)
  }

  return Buffer.from(await data.arrayBuffer())
}

export function storagePathFromUrl(url: string) {
  return url.slice(objectUrlPrefix().length)
}
