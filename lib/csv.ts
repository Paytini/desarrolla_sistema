export function parseCsvText(input: string) {
  const text = input.replace(/^\uFEFF/, "")
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ""
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === ",") {
      currentRow.push(currentValue.trim())
      currentValue = ""
      continue
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1
      }

      currentRow.push(currentValue.trim())
      const hasData = currentRow.some((value) => value !== "")
      if (hasData) {
        rows.push(currentRow)
      }

      currentRow = []
      currentValue = ""
      continue
    }

    currentValue += char
  }

  if (currentValue !== "" || currentRow.length > 0) {
    currentRow.push(currentValue.trim())
    const hasData = currentRow.some((value) => value !== "")
    if (hasData) {
      rows.push(currentRow)
    }
  }

  return rows
}

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  const normalized = String(value ?? "")
  const escaped = normalized.replace(/"/g, '""')

  return `"${escaped}"`
}

export function toCsvText(rows: Array<Array<string | number | boolean | null | undefined>>) {
  return rows.map((row) => row.map((value) => escapeCsvValue(value)).join(",")).join("\n")
}
