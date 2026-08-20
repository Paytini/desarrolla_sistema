"use client"

import { useState } from "react"
import { activateAccountAction } from "@/app/activar-cuenta/[token]/actions"

const ERROR_MESSAGES: Record<string, string> = {
  corta: "La contraseña debe tener al menos 8 caracteres.",
  no_coincide: "Las contraseñas no coinciden.",
}

export function ActivateAccountForm({
  token,
  employeeName,
  error,
}: {
  token: string
  employeeName: string
  error?: string
}) {
  const [showPw, setShowPw] = useState(false)
  const boundAction = activateAccountAction.bind(null, token)

  return (
    <main className="login-form-panel" style={{ width: "100%" }}>
      <div className="login-card">
        <header className="login-form-head">
          <h2 className="login-form-title">Activa tu cuenta</h2>
          <p className="login-form-subtitle">
            Hola {employeeName}, crea tu contraseña para entrar al portal.
          </p>
        </header>

        <form action={boundAction} className="login-form-body">
          <div className="login-field-group">
            <label className="login-field-label" htmlFor="new-password">
              Contraseña
            </label>
            <div className="login-pw-wrap">
              <input
                id="new-password"
                name="password"
                type={showPw ? "text" : "password"}
                minLength={8}
                required
                autoComplete="new-password"
                className="login-field-input login-field-input--pw"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="login-pw-toggle"
                tabIndex={-1}
              >
                {showPw ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <div className="login-field-group">
            <label className="login-field-label" htmlFor="confirm-password">
              Confirmar contraseña
            </label>
            <input
              id="confirm-password"
              name="confirm_password"
              type={showPw ? "text" : "password"}
              minLength={8}
              required
              autoComplete="new-password"
              className="login-field-input"
            />
          </div>

          {error ? (
            <div className="login-error-box" role="alert">
              <span>{ERROR_MESSAGES[error] ?? "No fue posible activar tu cuenta."}</span>
            </div>
          ) : null}

          <button type="submit" className="login-submit-btn">
            Activar cuenta
          </button>
        </form>
      </div>
    </main>
  )
}
