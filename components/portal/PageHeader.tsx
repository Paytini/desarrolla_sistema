type PageHeaderProps = {
  eyebrow?: string
  title: string
  description: string
}

export default function PageHeader({
  eyebrow,
  title,
  description,
}: PageHeaderProps) {
  return (
    <header className="space-y-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          {eyebrow}
        </p>
      ) : null}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>
    </header>
  )
}
