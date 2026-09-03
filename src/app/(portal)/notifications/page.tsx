import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getNotificationHistory, getUnreadNotificationCount } from "@/lib/notifications"
import { NotificationsHistoryView } from "@/components/notifications/NotificationsHistoryView"

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [{ items, nextCursor }, unreadCount] = await Promise.all([
    getNotificationHistory(session.user.id, { limit: 20 }),
    getUnreadNotificationCount(session.user.id),
  ])

  return (
    <NotificationsHistoryView
      initialItems={items.map((item) => ({ ...item, created_at: item.created_at.toISOString() }))}
      initialNextCursor={nextCursor}
      initialUnreadCount={unreadCount}
    />
  )
}
