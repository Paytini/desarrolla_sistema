import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getOrCreateDc3PdfBytes, Dc3MissingFieldsError } from "@/lib/dc3-pdf"
import {
  buildIssuedCertificates,
  filterIssuedCertificates,
  getCompanyCertificatesRecord,
} from "@/lib/certificates"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"

export const runtime = "nodejs"

export const maxDuration = 60

const MAX_ZIP_CERTIFICATES = 100

type CompanyEmployee = {
  id: number
  first_name: string
  last_name: string
  email: string
  department: string | null
  certificates: PortalCertificateRecord[]
  courses: PortalCourseRecord[]
}

export async function GET(request: NextRequest) {
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
    const empleado = await prisma.employee.findUnique({
      where: { email },
      select: {
        certificates: {
          select: { id: true, reference_number: true },
          orderBy: { issued_at: "desc" },
        },
      },
    })
    constancias = empleado?.certificates.map((c) => ({ id: c.id, folio: c.reference_number })) ?? []
  } else if (rol === "RH") {
    if (!empresa_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const company = await getCompanyCertificatesRecord(empresa_id)
    const employees = (company?.employees ?? []) as CompanyEmployee[]
    const issued = buildIssuedCertificates(employees)
    const filtered = filterIssuedCertificates(issued, {
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      department: request.nextUrl.searchParams.get("dept") ?? undefined,
      course: request.nextUrl.searchParams.get("course") ?? undefined,
    })

    constancias = filtered.map((c) => ({ id: c.id, folio: c.reference_number }))
  }

  if (constancias.length === 0) {
    return NextResponse.json({ error: "Sin constancias" }, { status: 404 })
  }

  if (constancias.length > MAX_ZIP_CERTIFICATES) {
    console.warn(
      `[constancias/zip] ${constancias.length} constancias solicitadas, recortando a las primeras ${MAX_ZIP_CERTIFICATES}`
    )
    constancias = constancias.slice(0, MAX_ZIP_CERTIFICATES)
  }

  const zip = new JSZip()

  for (const { id, folio } of constancias) {
    try {
      const pdfBytes = await getOrCreateDc3PdfBytes({ certificateId: id })
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
