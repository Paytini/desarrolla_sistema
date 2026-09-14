"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { storageProxyUrl } from "@/lib/storage-proxy"

const BRAND_LOGO = "/assets/logo/logo_desarrolla_cropped.webp"

type CompanyLogoProps = {
  src?: string | null
  alt?: string
  className?: string
  onNavy?: boolean
}

export function CompanyLogo({
  src,
  alt = "Logo de la empresa",
  className,
  onNavy,
}: CompanyLogoProps) {
  const resolvedSrc = src ? storageProxyUrl(src) : null
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const showBrand = !resolvedSrc || failedSrc === resolvedSrc

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo de tenant, dimensiones desconocidas; el proxy sirve el binario
    <img
      src={showBrand ? BRAND_LOGO : resolvedSrc}
      alt={showBrand ? "Desarrolla360" : alt}
      onError={() => setFailedSrc(resolvedSrc)}
      className={cn(
        "h-12 w-auto max-w-[190px] object-contain",
        onNavy && "opacity-95 [filter:brightness(0)_invert(1)]",
        className,
      )}
    />
  )
}
