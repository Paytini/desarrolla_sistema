interface SquiggleProps {
  color?: string
  width?: number
  className?: string
}

export function Squiggle({ color = '#8B5CF6', width = 80, className }: SquiggleProps) {
  const scaleX = width / 80
  return (
    <svg
      width={width}
      height={10}
      viewBox={`0 0 80 10`}
      fill="none"
      aria-hidden
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path
        d="M 0 6 C 10 0, 20 12, 30 6 C 40 0, 50 12, 60 6 C 70 0, 80 12, 80 6"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
