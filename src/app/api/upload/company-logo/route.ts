import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { isUuid } from "@/lib/uuid"
import {
  COMPANY_LOGO_ALLOWED_TYPES,
  COMPANY_LOGO_MAX_SIZE_BYTES,
  uploadCompanyLogo,
} from "@/lib/company/logo"

export const runtime = "nodejs"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const companyId = String(formData.get("companyId") ?? "").trim()

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 })
  }

  if (!isUuid(companyId)) {
    return NextResponse.json({ error: "ID de empresa inválido" }, { status: 400 })
  }

  if (!COMPANY_LOGO_ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Formato no válido. Usa PNG, JPG o WebP." }, { status: 400 })
  }

  if (file.size > COMPANY_LOGO_MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo supera el límite de 2 MB." }, { status: 400 })
  }

  const url = await uploadCompanyLogo(companyId, file)

  return NextResponse.json({ url })
}
