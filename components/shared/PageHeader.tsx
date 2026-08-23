import type { ReactNode } from "react"
import Link from "next/link"

type Breadcrumb = { label: string; href?: string }

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  accentColor?: string
  breadcrumbs?: Breadcrumb[]
}

export function PageHeader({
  title,
  description,
  action,
  accentColor = "var(--portal-blue)",
  breadcrumbs,
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
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" style={{ marginBottom: "6px" }}>
            <ol
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {breadcrumbs.map((crumb, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {i > 0 && (
                    <span style={{ color: "#D1D5DB", fontSize: "0.75rem", userSelect: "none" }}>
                      /
                    </span>
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      style={{ fontSize: "0.75rem", color: "#9CA3AF", textDecoration: "none" }}
                      className="hover:text-gray-600 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-outfit, "Outfit"), system-ui, sans-serif',
            fontSize: "1.75rem",
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: "#111827",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{ marginTop: "6px", fontSize: "0.875rem", color: "#6B7280", margin: "6px 0 0" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0, paddingTop: "4px" }}>{action}</div>}
    </div>
  )
}
