"use client"

type ToggleProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
}

export default function Toggle({ checked = false, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        checked ? "bg-[#E8761A]" : "bg-[#e2e8f0]"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  )
}
