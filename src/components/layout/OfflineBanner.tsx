"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export default function OfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  )

  useEffect(() => {
    const handleOffline = () => {
      console.warn("[OfflineBanner] offline event fired", {
        at: new Date().toISOString(),
        navigatorOnLine: navigator.onLine,
      })
      setOffline(true)
    }
    const handleOnline = () => {
      console.warn("[OfflineBanner] online event fired", {
        at: new Date().toISOString(),
        navigatorOnLine: navigator.onLine,
      })
      setOffline(false)
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  if (!offline) {
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
