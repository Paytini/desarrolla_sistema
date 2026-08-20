import { readFile } from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { ApiReferenceClient } from "@/components/superadmin/ApiReferenceClient"

export default async function ApiDocsPage() {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") redirect("/login")

  const raw = await readFile(path.join(process.cwd(), "openapi.yaml"), "utf-8")
  const spec = parse(raw) as Record<string, unknown>

  return <ApiReferenceClient spec={spec} />
}
