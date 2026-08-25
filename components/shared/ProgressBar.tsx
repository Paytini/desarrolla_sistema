type ProgressBarProps = {
  value: number
  className?: string
  trackClassName?: string
  fillClassName?: string
}

function defaultFillColor(value: number) {
  if (value >= 75) return "bg-portal-blue"
  if (value > 0) return "bg-amber-500"
  return "bg-slate-300"
}

export default function ProgressBar({
  value,
  className = "",
  trackClassName = "bg-slate-100",
  fillClassName,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={`h-2 overflow-hidden rounded-full ${trackClassName} ${className}`}>
      <div
        className={`h-full rounded-full ${fillClassName ?? defaultFillColor(clamped)}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
