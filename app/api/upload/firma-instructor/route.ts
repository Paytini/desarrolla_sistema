import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { getSession } from "@/lib/session"

export const runtime = "nodejs"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.rol !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const nombreRaw = formData.get("nombre") as string | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 })
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

  // Normalizar a PNG estándar (sin alpha problemático, sin interlacing)
  const pngBuffer = await sharp(rawBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer()

  // Nombre de archivo: usa el nombre proporcionado o el original, sanitizado
  const base = (nombreRaw || file.name.replace(/\.[^.]+$/, ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // quitar acentos
    .replace(/[^a-z0-9-_]/g, "-")      // solo alfanumérico y guiones
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)

  if (!base) {
    return NextResponse.json({ error: "Nombre de archivo inválido" }, { status: 400 })
  }

  const filename = `${base}.png`
  const signaturesDir = path.join(process.cwd(), "public", "assets", "signatures", "instructors")

  await fs.mkdir(signaturesDir, { recursive: true })
  await fs.writeFile(path.join(signaturesDir, filename), pngBuffer)

  const url = `/assets/signatures/instructors/${filename}`
  return NextResponse.json({ url })
}
