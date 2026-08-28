import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { setNotificationArchived } from "@/lib/notifications"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (typeof body?.archived !== "boolean") {
    return NextResponse.json({ error: "archived debe ser boolean" }, { status: 400 })
  }

  await setNotificationArchived(session.user.id, id, body.archived)

  return NextResponse.json({ ok: true })
}
