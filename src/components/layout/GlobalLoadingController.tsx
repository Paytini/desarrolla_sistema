"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import LoadingOverlay from "@/components/layout/LoadingOverlay"

function buildTrackedUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return new URL(input, window.location.href)
  }

  if (input instanceof URL) {
    return new URL(input.toString(), window.location.href)
  }

  return new URL(input.url, window.location.href)
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) {
    return init.method.toUpperCase()
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase()
  }

  return "GET"
}

function shouldTrackFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = buildTrackedUrl(input)
  const method = getRequestMethod(input, init)
  const sameOrigin = url.origin === window.location.origin

  if (!sameOrigin) {
    return false
  }

  const headers = new Headers(
    init?.headers ??
      (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined),
  )

  if (headers.get("x-skip-global-loading") === "1") {
    return false
  }

  if (method !== "GET") {
    return true
  }

  if (!url.pathname.startsWith("/api/")) {
    return false
  }

  return headers.get("purpose") !== "prefetch" && headers.get("next-router-prefetch") !== "1"
}

export default function GlobalLoadingController() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState("Cargando...")
  const [detail, setDetail] = useState("Estamos actualizando la informacion del portal.")
  const activeRequestsRef = useRef(0)
  const hideTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const show = (nextMessage: string, nextDetail: string) => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }

      setMessage(nextMessage)
      setDetail(nextDetail)
      setVisible(true)
    }

    const hideIfIdle = () => {
      if (activeRequestsRef.current > 0) {
        return
      }

      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current)
      }

      hideTimeoutRef.current = window.setTimeout(() => {
        setVisible(false)
      }, 180)
    }

    const handleSubmit = (event: Event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) {
        return
      }

      if (form.target === "_blank" || form.hasAttribute("data-skip-loading")) {
        return
      }

      const customMessage = form.dataset.loadingMessage?.trim()
      const customDetail = form.dataset.loadingDetail?.trim()

      show(
        customMessage || "Procesando...",
        customDetail || "Estamos guardando cambios y preparando la respuesta.",
      )
    }

    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const tracked = shouldTrackFetch(input, init)

      if (tracked) {
        activeRequestsRef.current += 1
        show("Cargando...", "Estamos consultando o actualizando informacion del portal.")
      }

      try {
        return await originalFetch(input, init)
      } finally {
        if (tracked) {
          activeRequestsRef.current = Math.max(activeRequestsRef.current - 1, 0)
          hideIfIdle()
        }
      }
    }

    document.addEventListener("submit", handleSubmit, true)
    window.addEventListener("pageshow", hideIfIdle)

    return () => {
      window.fetch = originalFetch
      document.removeEventListener("submit", handleSubmit, true)
      window.removeEventListener("pageshow", hideIfIdle)

      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!visible) {
      return
    }

    if (activeRequestsRef.current === 0) {
      const timeoutId = window.setTimeout(() => {
        setVisible(false)
      }, 180)

      return () => window.clearTimeout(timeoutId)
    }
  }, [pathname, searchParams, visible])

  if (!visible) {
    return null
  }

  return <LoadingOverlay message={message} detail={detail} />
}
