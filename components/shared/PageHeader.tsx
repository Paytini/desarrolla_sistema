import type { ReactNode } from "react"
import { Squiggle } from "@/components/shared/Squiggle"

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  accentColor?: string
}

export function PageHeader({ title, description, action, accentColor = '#8B5CF6' }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
            fontSize: '1.75rem',
            fontWeight: 800,
            lineHeight: 1.2,
            color: '#1E293B',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <div style={{ marginTop: '6px' }}>
          <Squiggle color={accentColor} width={Math.min(title.length * 10, 120)} />
        </div>
        {description && (
          <p style={{ marginTop: '8px', fontSize: '0.875rem', color: '#64748B', margin: '8px 0 0' }}>
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0, paddingTop: '4px' }}>{action}</div>}
    </div>
  )
}
