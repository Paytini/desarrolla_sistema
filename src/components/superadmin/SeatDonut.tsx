import { amber, portalColors, red, slate } from "@/lib/theme-tokens"

export function SeatDonut({
  used,
  total,
  size = 72,
}: {
  used: number
  total: number
  size?: number
}) {
  const pct = total ? Math.round((used / total) * 100) : 0
  const sw = size >= 64 ? 8 : 6
  const r = (size - sw) / 2 - 4
  const cx = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 90 ? red[600] : pct >= 70 ? amber[600] : portalColors.navy

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={slate[100]} strokeWidth={sw} />
      {used > 0 && (
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      )}
      <text
        x={cx}
        y={cx + size * 0.056}
        textAnchor="middle"
        fill={slate[900]}
        fontSize={size * 0.167}
        fontWeight="600"
      >
        {pct}%
      </text>
    </svg>
  )
}
