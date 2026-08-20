import Image from "next/image"
import Link from "next/link"
import { findUserByValidActivationToken } from "@/lib/onboarding"
import { ActivateAccountForm } from "@/components/onboarding/ActivateAccountForm"

type PageProps = {
  params: Promise<{ token: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ActivateAccountPage({ params, searchParams }: PageProps) {
  const { token } = await params
  const query = await searchParams
  const errorParam = query?.error
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam

  const user = await findUserByValidActivationToken(token)

  if (!user) {
    return (
      <div className="login-root">
        <main className="login-form-panel" style={{ width: "100%" }}>
          <div className="login-card">
            <div className="login-card-logo">
              <Image
                src="/assets/logo_desarrolla_cropped.png"
                alt="Desarrolla360"
                width={220}
                height={66}
                className="h-11 w-auto object-contain"
                priority
              />
            </div>
            <header className="login-form-head">
              <h2 className="login-form-title">Enlace no válido</h2>
              <p className="login-form-subtitle">
                Este enlace de activación ya venció o ya fue utilizado. Pide a tu empresa que te
                reenvíe la invitación.
              </p>
            </header>
            <Link
              href="/login"
              className="login-submit-btn"
              style={{ display: "block", textAlign: "center" }}
            >
              Ir al login
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="login-root">
      <ActivateAccountForm token={token} employeeName={user.name} error={error} />
    </div>
  )
}
