import { NextResponse } from "next/server"
import JSZip from "jszip"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { generateDc3Pdf, Dc3MissingFieldsError } from "@/lib/dc3-pdf"

export const runtime = "nodejs"

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { rol, email, empresa_id } = session.user

  if (rol === "SUPERADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  type ConstanciaRef = { id: number; folio: string }
  let constancias: ConstanciaRef[] = []

  if (rol === "EMPLEADO") {
    if (!email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const empleado = await prisma.empleado.findUnique({
      where: { email },
      select: {
        constancias: {
          select: { id: true, folio: true },
          orderBy: { fecha_emision: "desc" },
        },
      },
    })
    constancias = empleado?.constancias ?? []
  } else if (rol === "RH") {
    if (!empresa_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    constancias = await prisma.constancia.findMany({
      where: {
        empleado: { empresa_id, activo: true },
      },
      select: { id: true, folio: true },
      orderBy: { fecha_emision: "desc" },
    })
  }

  if (constancias.length === 0) {
    return NextResponse.json({ error: "Sin constancias" }, { status: 404 })
  }

  const zip = new JSZip()

  for (const { id, folio } of constancias) {
    try {
      const pdfBytes = await generateDc3Pdf({ certificateId: id })
      zip.file(`${folio}.pdf`, pdfBytes)
    } catch (err) {
      if (err instanceof Dc3MissingFieldsError) {
        console.error(`[constancias/zip] Constancia ${id} (folio: ${folio}) omitida — campos DC-3 faltantes:`, err.fields)
      } else {
        console.error(`[constancias/zip] Error generando PDF para constancia ${id}:`, err)
      }
    }
  }

  if (Object.keys(zip.files).length === 0) {
    return NextResponse.json({ error: "No se pudo generar ningún PDF" }, { status: 500 })
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="constancias-dc3.zip"',
      "Cache-Control": "no-store",
    },
  })
}
