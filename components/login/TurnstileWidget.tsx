"use client"

import { useEffect, useId, useRef, useState } from "react"
import Script from "next/script"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
        }
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

type TurnstileWidgetProps = {
  onVerify: (token: string) => void
  onExpire?: () => void
}

export function TurnstileWidget({ onVerify, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef   = useRef<string | null>(null)
  const onVerifyRef   = useRef(onVerify)
  const onExpireRef   = useRef(onExpire)
  const [scriptReady, setScriptReady] = useState(false)
  const elementId = useId()

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  onVerifyRef.current = onVerify
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || widgetIdRef.current) return

    widgetIdRef.current = window.turnstile!.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onVerifyRef.current(token),
      "expired-callback": () => onExpireRef.current?.(),
    })

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [scriptReady, siteKey])

  if (!siteKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("NEXT_PUBLIC_TURNSTILE_SITE_KEY no está configurada — el widget no se renderizará.")
    }
    return null
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} id={elementId} />
    </>
  )
}
