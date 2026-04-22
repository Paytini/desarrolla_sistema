type StatusNoticeProps = {
  tone: "success" | "error"
  message: string
}

const toneClasses = {
  success: "border-teal-200 bg-teal-50 text-teal-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
}

export default function StatusNotice({ tone, message }: StatusNoticeProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone]}`}>
      {message}
    </div>
  )
}
