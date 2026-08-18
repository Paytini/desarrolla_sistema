import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { put } from "@vercel/blob"
import { getSession } from "@/lib/session"

export const runtime = "nodejs"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.rol !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const nombreRaw = formData.get("nombre") as string | null
  const wpCourseId = Number(formData.get("wpCourseId"))

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 })
  }

  if (!Number.isInteger(wpCourseId) || wpCourseId <= 0) {
    return NextResponse.json({ error: "ID de curso inválido" }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no válido. Usa PNG, JPG o WebP." },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 2 MB." },
      { status: 400 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const rawBuffer = Buffer.from(arrayBuffer)

  const pngBuffer = await sharp(rawBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer()

  const base = (nombreRaw || file.name.replace(/\.[^.]+$/, ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)

  if (!base) {
    return NextResponse.json({ error: "Nombre de archivo inválido" }, { status: 400 })
  }

  const filename = `signatures/instructors/${wpCourseId}/${base}-${Date.now()}.png`
  const blob = await put(filename, pngBuffer, {
    access: "private",
    contentType: "image/png",
    addRandomSuffix: false,
  })

  return NextResponse.json({ url: blob.url })
}
