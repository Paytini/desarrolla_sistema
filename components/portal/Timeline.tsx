type DotColor = "orange" | "green" | "amber" | "red" | "slate"

type TimelineItem = {
  title: string
  description?: string
  dot?: DotColor
}

type TimelineProps = {
  items: TimelineItem[]
}

const dotMap: Record<DotColor, string> = {
  orange: "bg-[#F5853F]",
  green:  "bg-[#22c55e]",
  amber:  "bg-[#f59e0b]",
  red:    "bg-[#ef4444]",
  slate:  "bg-[#94a3b8]",
}

export default function Timeline({ items }: TimelineProps) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 border-b border-[#f8f8f8] py-3 last:border-none">
          <div className={`mt-[5px] size-2 shrink-0 rounded-full ${dotMap[item.dot ?? "slate"]}`} />
          <div>
            <p className="text-[13px] font-semibold text-[#1a1a1a]">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-[11.5px] text-[#94a3b8]">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
