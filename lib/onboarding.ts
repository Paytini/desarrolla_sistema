import { randomBytes } from "node:crypto"
import bcrypt from "bcrypt"
import { createAuditEvent, getAuditActorFromSession } from "@/lib/auditing"
import { prisma } from "@/lib/prisma"
import { getPortalBaseUrl } from "@/lib/email-templates/shared"

const ACTIVATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PENDING_ACTIVATION_PASSWORD_HASH = "pending-activation"
const PASSWORD_HASH_ROUNDS = 12

export function buildPendingActivationFields() {
  return {
    passwordHash: PENDING_ACTIVATION_PASSWORD_HASH,
    activationToken: randomBytes(32).toString("base64url"),
    activationTokenExpiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
  }
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS)
}

export function generateRandomPassword() {
  return randomBytes(9).toString("base64url")
}

export function buildActivationUrl(token: string) {
  const baseUrl = getPortalBaseUrl()
  if (!baseUrl) {
    throw new Error(
      "NEXTAUTH_URL no está configurado, no se puede construir el enlace de activación",
    )
  }
  return `${baseUrl}/activar-cuenta/${token}`
}

export async function findUserByValidActivationToken(token: string) {
  if (!token) return null

  const user = await prisma.user.findUnique({
    where: { activation_token: token },
    select: {
      id: true,
      name: true,
      email: true,
      company_id: true,
      activation_token_expires_at: true,
    },
  })

  if (!user || !user.activation_token_expires_at || user.activation_token_expires_at < new Date()) {
    return null
  }

  return user
}

export async function completeActivation(userId: string, token: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 12)

  const result = await prisma.user.updateMany({
    where: { id: userId, activation_token: token },
    data: {
      password_hash: passwordHash,
      activation_token: null,
      activation_token_expires_at: null,
    },
  })

  if (result.count === 0) {
    return false
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, company_id: true },
  })
  await createAuditEvent({
    actor: getAuditActorFromSession(null),
    accion: "CUENTA_ACTIVADA",
    entityType: "USUARIO",
    entityId: userId,
    companyId: user?.company_id ?? null,
    resumen: `${user?.name ?? "El usuario"} activó su cuenta y estableció su contraseña.`,
  })

  return true
}
