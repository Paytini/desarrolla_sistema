type InfoFieldProps = {
  label: string
  value: string
  truncate?: boolean
}

export function InfoField({ label, value, truncate = true }: InfoFieldProps) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm text-slate-800 ${truncate ? "truncate" : ""}`}>{value}</p>
    </div>
  )
}
