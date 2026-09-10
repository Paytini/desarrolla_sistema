import type { ReactNode } from "react"
import Image from "next/image"
import { BookOpen } from "lucide-react"

const DEFAULT_SIZES = "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"

type CourseCoverProps = {
  src?: string | null
  alt?: string
  className?: string
  sizes?: string
  fit?: "cover" | "contain"
  priority?: boolean
  fallback?: ReactNode
  children?: ReactNode
}

export function CourseCover({
  src,
  alt = "",
  className = "relative h-36 w-full",
  sizes = DEFAULT_SIZES,
  fit = "cover",
  priority,
  fallback,
  children,
}: CourseCoverProps) {
  return (
    <div className={`${className} overflow-hidden`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={fit === "contain" ? "object-contain" : "object-cover"}
        />
      ) : (
        (fallback ?? (
          <div className="flex h-full w-full items-center justify-center bg-portal-blue-soft text-portal-blue">
            <BookOpen size={40} strokeWidth={1.75} />
          </div>
        ))
      )}
      {children}
    </div>
  )
}
