import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import {
  getNotificationHistory,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/notifications"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const usuarioId = session.user.id
  const { searchParams } = request.nextUrl
  const cursor = searchParams.get("cursor") ?? undefined
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined
  const unreadOnly = searchParams.get("unreadOnly") === "true"
  const archived = searchParams.get("archived") === "true"

  const [{ items, nextCursor }, unreadCount] = await Promise.all([
    getNotificationHistory(usuarioId, { cursor, limit, unreadOnly, archived }),
    getUnreadNotificationCount(usuarioId),
  ])

  return NextResponse.json({ items, nextCursor, unreadCount })
}

export async function PATCH() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const usuarioId = session.user.id
  await markAllNotificationsRead(usuarioId)

  return NextResponse.json({ ok: true })
}
