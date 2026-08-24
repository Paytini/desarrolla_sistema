import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { ChangePasswordForm } from "@/components/onboarding/ChangePasswordForm"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ChangePasswordPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "EMPLOYEE") {
    redirect("/login")
  }

  const query = await searchParams
  const errorParam = query?.error
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam

  return (
    <div className="login-root">
      <ChangePasswordForm error={error} />
    </div>
  )
}
