"use client"

import { useCallback, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"

type EmployeeLearningRefreshProps = {
  autoRefresh?: boolean
  pollIntervalMs?: number
}

const MIN_POLL_INTERVAL_MS = 15_000
const POLL_JITTER_RATIO = 0.2

export default function EmployeeLearningRefresh({
  autoRefresh = false,
  pollIntervalMs = 60_000,
}: EmployeeLearningRefreshProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const didAutoRefresh = useRef(false)
  const requestInFlight = useRef(false)
  const latestSyncAtRef = useRef<string | null>(null)

  const refreshLearning = useCallback(
    async (force: boolean) => {
      if (requestInFlight.current) {
        return
      }

      requestInFlight.current = true

      try {
        const response = await fetch("/api/employee/learning/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-skip-global-loading": "1",
          },
          body: JSON.stringify({ force }),
        })
        const payload = (await response.json().catch(() => null)) as {
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
      } finally {
        requestInFlight.current = false
      }
    },
    [router],
  )

  useEffect(() => {
    if (!autoRefresh || didAutoRefresh.current) {
      return
    }

    didAutoRefresh.current = true
    void refreshLearning(true)
  }, [autoRefresh, refreshLearning])

  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs < MIN_POLL_INTERVAL_MS) {
      return
    }

    let timeoutId: number
    let cancelled = false

    function scheduleNext() {
      const jitter = pollIntervalMs * POLL_JITTER_RATIO * (Math.random() * 2 - 1)
      timeoutId = window.setTimeout(() => {
        if (cancelled) return

        if (document.visibilityState === "visible" && !requestInFlight.current && !isPending) {
          void refreshLearning(false)
        }

        scheduleNext()
      }, pollIntervalMs + jitter)
    }

    scheduleNext()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [isPending, pollIntervalMs, refreshLearning])

  return null
}
