"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type EmployeeLearningRefreshProps = {
  autoRefresh?: boolean
  pollIntervalMs?: number
}

export default function EmployeeLearningRefresh({
  autoRefresh = false,
  pollIntervalMs = 30_000,
}: EmployeeLearningRefreshProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const didAutoRefresh = useRef(false)

  async function refreshLearning(force: boolean, silent = false) {
    if (!silent) {
      setSyncing(true)
    }
    setMessage(null)

    try {
      const response = await fetch("/api/empleado/learning/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(silent ? { "x-skip-global-loading": "1" } : {}),
        },
        body: JSON.stringify({ force }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.ok) {
        setMessage(payload?.message ?? "No fue posible refrescar el progreso en este momento.")
        return
      }

      startTransition(() => {
        router.refresh()
      })
    } catch {
      if (!silent) {
        setMessage("No fue posible conectar con el servicio de sincronizacion.")
      }
    } finally {
      if (!silent) {
        setSyncing(false)
      }
    }
  }

  useEffect(() => {
    if (!autoRefresh || didAutoRefresh.current) {
      return
    }

    didAutoRefresh.current = true
    void refreshLearning(false, true)
  }, [autoRefresh])

  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs < 15_000) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible" || syncing || isPending) {
        return
      }

      void refreshLearning(false, true)
    }, pollIntervalMs)

    return () => window.clearInterval(intervalId)
  }, [isPending, pollIntervalMs, syncing])

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-950 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="font-semibold">
          {syncing || isPending ? "Actualizando progreso..." : "Progreso conectado con Tutor LMS"}
        </p>
        <p className="leading-6 text-sky-900">
          {message ??
            "El portal refresca tu avance automaticamente cuando detecta datos antiguos. Tambien puedes actualizar ahora despues de terminar una actividad en Tutor LMS."}
        </p>
      </div>

      <button
        type="button"
        onClick={() => refreshLearning(true)}
        disabled={syncing || isPending}
        className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {syncing || isPending ? "Actualizando..." : "Actualizar ahora"}
      </button>
    </div>
  )
}
