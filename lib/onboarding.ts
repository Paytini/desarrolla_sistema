import { randomBytes } from "node:crypto"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { getPortalBaseUrl } from "@/lib/email-templates/shared"

const ACTIVATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PENDING_ACTIVATION_PASSWORD_HASH = "pending-activation"

export function buildPendingActivationFields() {
  return {
    passwordHash: PENDING_ACTIVATION_PASSWORD_HASH,
    activationToken: randomBytes(32).toString("base64url"),
    activationTokenExpiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
  }
}

export function buildActivationUrl(token: string) {
  const baseUrl = getPortalBaseUrl()
  const path = `/activar-cuenta/${token}`
  return baseUrl ? `${baseUrl}${path}` : path
}

export async function findUserByValidActivationToken(token: string) {
  if (!token) return null

  const user = await prisma.user.findUnique({
    where: { activation_token: token },
    select: { id: true, name: true, email: true, activation_token_expires_at: true },
  })

  if (!user || !user.activation_token_expires_at || user.activation_token_expires_at < new Date()) {
    return null
  }

  return user
}

export async function completeActivation(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: userId },
    data: {
      password_hash: passwordHash,
      activation_token: null,
      activation_token_expires_at: null,
    },
  })
}
