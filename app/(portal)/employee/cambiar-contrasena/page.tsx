import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ChangePasswordForm } from "@/components/onboarding/ChangePasswordForm"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ChangePasswordPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "EMPLOYEE") {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { must_change_password: true },
  })

  if (!user?.must_change_password) {
    redirect("/employee/courses")
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
