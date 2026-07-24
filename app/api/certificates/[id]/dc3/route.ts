import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { generateDc3Pdf, Dc3MissingFieldsError } from "@/lib/dc3-pdf"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  const constanciaId = Number(id)
  if (!Number.isInteger(constanciaId) || constanciaId <= 0) {
    return NextResponse.json({ error: "ID de constancia invalido" }, { status: 400 })
  }

  const constancia = await prisma.constancia.findUnique({
    where: { id: constanciaId },
    include: { empleado: true },
  })

  if (!constancia) {
    return NextResponse.json({ error: "Constancia no encontrada" }, { status: 404 })
  }

  const rol = session.user.rol
  const sessionEmpresaId = session.user.empresa_id ?? null
  const sessionEmail = session.user.email ?? null

  const isOwner =
    rol === "EMPLEADO" && sessionEmail != null && constancia.empleado.email === sessionEmail
  const isCompanyHr =
    rol === "RH" && sessionEmpresaId != null && constancia.empleado.empresa_id === sessionEmpresaId
  const isSuperAdmin = rol === "SUPERADMIN"

  if (!isOwner && !isCompanyHr && !isSuperAdmin) {
    return NextResponse.json({ error: "Sin permisos para esta constancia" }, { status: 403 })
  }

  const download = request.nextUrl.searchParams.get("download") === "1"

  try {
    const pdfBytes = await generateDc3Pdf({ certificateId: constanciaId })
    const disposition = download ? "attachment" : "inline"
    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="DC3-${constancia.folio}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    if (err instanceof Dc3MissingFieldsError) {
      return NextResponse.json(
        {
          error: "Faltan campos obligatorios para emitir el DC-3",
          missing: err.fields,
        },
        { status: 422 },
      )
    }
    console.error("[dc3] error generando PDF:", err)
    return NextResponse.json({ error: "Error generando el DC-3" }, { status: 500 })
  }
}
