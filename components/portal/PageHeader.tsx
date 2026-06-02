type PageHeaderProps = {
  eyebrow?: string
  title: string
  description: string
  actions?: React.ReactNode
}

export default function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#F5853F]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[24px] font-bold tracking-tight text-[#1a1a1a]">{title}</h1>
        <p className="text-[14px] text-[#64748b]">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
