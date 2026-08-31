"use client"

import { useState } from "react"
import { changeOwnPasswordAction } from "@/app/(portal)/employee/change-password/actions"

const ERROR_MESSAGES: Record<string, string> = {
  corta: "La contraseña debe tener al menos 8 caracteres.",
  no_coincide: "Las contraseñas no coinciden.",
}

export function ChangePasswordForm({ error }: { error?: string }) {
  const [showPw, setShowPw] = useState(false)

  return (
    <main className="login-form-panel" style={{ width: "100%" }}>
      <div className="login-card">
        <header className="login-form-head">
          <h2 className="login-form-title">Actualiza tu contraseña</h2>
          <p className="login-form-subtitle">
            Tu empresa te asignó una contraseña temporal. Crea una nueva antes de continuar.
          </p>
        </header>

        <form action={changeOwnPasswordAction} className="login-form-body">
          <div className="login-field-group">
            <label className="login-field-label" htmlFor="new-password">
              Nueva contraseña
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
              <span>{ERROR_MESSAGES[error] ?? "No fue posible actualizar tu contraseña."}</span>
            </div>
          ) : null}

          <button type="submit" className="login-submit-btn">
            Guardar contraseña
          </button>
        </form>
      </div>
    </main>
  )
}
