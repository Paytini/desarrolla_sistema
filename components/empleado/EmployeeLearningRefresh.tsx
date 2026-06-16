"use client"

import { useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"

type EmployeeLearningRefreshProps = {
  autoRefresh?: boolean
  pollIntervalMs?: number
}

export default function EmployeeLearningRefresh({
  autoRefresh = false,
  pollIntervalMs = 15_000,
}: EmployeeLearningRefreshProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const didAutoRefresh = useRef(false)
  const requestInFlight = useRef(false)
  const latestSyncAtRef = useRef<string | null>(null)

  async function refreshLearning(force: boolean) {
    if (requestInFlight.current) {
      return
    }

    requestInFlight.current = true

    try {
      const response = await fetch("/api/empleado/learning/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-skip-global-loading": "1",
        },
        body: JSON.stringify({ force }),
      })
      const payload = await response.json().catch(() => null) as {
        ok?: boolean
        latestSyncAt?: string | null
      } | null

      if (!response.ok || !payload?.ok) {
        return
      }

      const latestSyncAt = payload.latestSyncAt ?? null
      const shouldRefresh = force || (latestSyncAt && latestSyncAt !== latestSyncAtRef.current)

      if (latestSyncAt) {
        latestSyncAtRef.current = latestSyncAt
      }

      if (shouldRefresh) {
        startTransition(() => {
          router.refresh()
        })
      }
    } catch {
      // La sincronizacion es oportunista: si Tutor/WordPress falla, conservamos la vista actual.
    } finally {
      requestInFlight.current = false
    }
  }

  useEffect(() => {
    if (!autoRefresh || didAutoRefresh.current) {
      return
    }

    didAutoRefresh.current = true
    void refreshLearning(true)
  }, [autoRefresh])

  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs < 15_000) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible" || requestInFlight.current || isPending) {
        return
      }

      void refreshLearning(false)
    }, pollIntervalMs)

    return () => window.clearInterval(intervalId)
  }, [isPending, pollIntervalMs])

  return null
}
