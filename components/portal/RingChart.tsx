/** Mini ring chart with single color fill — used inside KpiCard's optional `ring` slot */
export function RingChart({ pct, size = 56, sw = 6, color }: { pct: number; size?: number; sw?: number; color: string }) {
  const r    = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (Math.min(pct, 100) / 100) * circ
  const cx   = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
        transform={`rotate(-90 ${cx} ${cx})`} />
      <text x={cx} y={cx + 4} textAnchor="middle" fill="#0f172a" fontSize={11} fontWeight="700">{pct}%</text>
    </svg>
  )
}
