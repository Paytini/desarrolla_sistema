import type { ReactNode } from "react"
import { fd, gray } from "@/lib/theme-tokens"

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  accentColor?: string
}

export function PageHeader({
  title,
  description,
  action,
  accentColor = "var(--portal-blue)",
}: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
      }}
    >
      <div style={{ minWidth: 0, borderLeft: `4px solid ${accentColor}`, paddingLeft: "16px" }}>
        <h1
          style={{
            fontFamily: 'var(--font-outfit, "Outfit"), system-ui, sans-serif',
            fontSize: "1.75rem",
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: fd.foreground,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{ marginTop: "6px", fontSize: "0.875rem", color: gray[500], margin: "6px 0 0" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0, paddingTop: "4px" }}>{action}</div>}
    </div>
  )
}
