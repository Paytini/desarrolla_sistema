import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export const runtime = "nodejs"

// Proxy autenticado para blobs privados de Vercel.
// El cliente no puede cargar una URL private.blob.vercel-storage.com directamente
// porque requiere Authorization: Bearer {BLOB_READ_WRITE_TOKEN}.
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return new NextResponse("No autorizado", { status: 401 })
  }

  const blobUrl = request.nextUrl.searchParams.get("url")
  if (!blobUrl || !blobUrl.includes("blob.vercel-storage.com")) {
    return new NextResponse("URL inválida", { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return new NextResponse("Token de blob no configurado", { status: 500 })
  }

  const upstream = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!upstream.ok) {
    return new NextResponse("No se pudo obtener la imagen", { status: upstream.status })
  }

  const buffer = await upstream.arrayBuffer()
  const contentType = upstream.headers.get("content-type") ?? "image/png"

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
