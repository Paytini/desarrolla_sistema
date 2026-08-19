import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import {
  getRecentNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/notifications"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const usuarioId = session.user.id

  const [items, unreadCount] = await Promise.all([
    getRecentNotifications(usuarioId),
    getUnreadNotificationCount(usuarioId),
  ])

  return NextResponse.json({ items, unreadCount })
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
