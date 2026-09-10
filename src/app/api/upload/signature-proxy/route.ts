import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import {
  downloadPrivateFile,
  isSupabaseStorageUrl,
  storagePathFromUrl,
} from "@/lib/supabase-storage"

export const runtime = "nodejs"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return new NextResponse("No autorizado", { status: 401 })
  }

  const fileUrl = request.nextUrl.searchParams.get("url")
  if (!fileUrl || !isSupabaseStorageUrl(fileUrl)) {
    return new NextResponse("URL inválida", { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = await downloadPrivateFile(storagePathFromUrl(fileUrl))
  } catch {
    return new NextResponse("No se pudo obtener la imagen", { status: 502 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      // El nombre del archivo lleva un timestamp (logos/<id>/<Date.now()>.png), asi que
      // cada URL es inmutable: el navegador la cachea "para siempre" y no se vuelve a
      // pedir a Supabase Storage. Un logo nuevo genera una URL nueva. Sigue siendo
      // `private` (no CDN compartido) para mantener el acceso autenticado por usuario.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  })
}
