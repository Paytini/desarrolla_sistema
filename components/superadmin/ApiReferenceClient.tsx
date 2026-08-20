"use client"

import { ApiReferenceReact } from "@scalar/api-reference-react"

export function ApiReferenceClient({ spec }: { spec: Record<string, unknown> }) {
  return (
    <ApiReferenceReact
      configuration={{
        content: spec,
        theme: "default",
        hideClientButton: true,
      }}
    />
  )
}
