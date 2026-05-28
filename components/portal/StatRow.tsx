type StatRowProps = {
  label: string
  children: React.ReactNode
}

export default function StatRow({ label, children }: StatRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-[#f8f8f8] py-3 last:border-none">
      <p className="text-[13px] text-[#64748b]">{label}</p>
      <div className="text-[13.5px] font-bold text-[#1a1a1a]">{children}</div>
    </div>
  )
}
