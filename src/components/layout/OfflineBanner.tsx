"use client"

import { useSyncExternalStore } from "react"
import { WifiOff } from "lucide-react"

function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true
}

export default function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (online) {
    return null
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[10000] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950"
    >
      <WifiOff size={16} strokeWidth={2.5} />
      Sin conexion a internet. Algunos cambios podrian no guardarse hasta que vuelva la conexion.
    </div>
  )
}
