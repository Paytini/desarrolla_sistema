type ShapeType = 'circle' | 'triangle' | 'square' | 'pill'

interface Shape {
  type: ShapeType
  color: string
  size: number
  top?: string | number
  bottom?: string | number
  left?: string | number
  right?: string | number
  opacity?: number
  rotate?: number
}

interface GeometricDecorProps {
  shapes: Shape[]
}

function ShapeSvg({ type, color, size }: Pick<Shape, 'type' | 'color' | 'size'>) {
  if (type === 'triangle') {
    const h = (size * Math.sqrt(3)) / 2
    return (
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} fill="none" aria-hidden>
        <polygon points={`${size / 2},0 ${size},${h} 0,${h}`} fill={color} />
      </svg>
    )
  }
  if (type === 'square') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden>
        <rect width={size} height={size} fill={color} />
      </svg>
    )
  }
  if (type === 'pill') {
    return (
      <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} fill="none" aria-hidden>
        <rect width={size} height={size / 2} rx={size / 4} fill={color} />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
    </svg>
  )
}

export function GeometricDecor({ shapes }: GeometricDecorProps) {
  return (
    <>
      {shapes.map((shape, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            top: shape.top,
            bottom: shape.bottom,
            left: shape.left,
            right: shape.right,
            opacity: shape.opacity ?? 0.15,
            transform: shape.rotate ? `rotate(${shape.rotate}deg)` : undefined,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <ShapeSvg type={shape.type} color={shape.color} size={shape.size} />
        </div>
      ))}
    </>
  )
}
