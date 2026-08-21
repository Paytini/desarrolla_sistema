import NextAuth from "next-auth"
import { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { after } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { deriveCompanyAccessStatus } from "@/lib/company-status"
import { authConfig } from "@/auth.config"

class EmpresaBloqueadaError extends CredentialsSignin {
  constructor(reason: "suspendida" | "vencida") {
    super()
    this.code = reason === "suspendida" ? "empresa_suspendida" : "empresa_vencida"
  }
}

class CuentaPendienteActivacionError extends CredentialsSignin {
  constructor() {
    super()
    this.code = "cuenta_pendiente_activacion"
  }
}

if (!authConfig.secret) {
  throw new Error(
    "AUTH_SECRET (o NEXTAUTH_SECRET) es requerida. Configura la variable de entorno antes de iniciar.",
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile Token", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        const captchaValid = await verifyTurnstileToken(
          credentials.turnstileToken as string | undefined,
          remoteIp,
        )
        if (!captchaValid) return null

        try {
          const usuario = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              company: {
                select: {
                  name: true,
                  slug: true,
                  active: true,
                  packages: {
                    where: { active: true },
                    select: { expiration_date: true },
                    take: 1,
                  },
                },
              },
            },
          })

          if (!usuario || !usuario.active) return null

          if (usuario.activation_token) {
            throw new CuentaPendienteActivacionError()
          }

          const valida = await bcrypt.compare(credentials.password as string, usuario.password_hash)
          if (!valida) return null

          if (usuario.role !== "SUPERADMIN" && usuario.company_id) {
            const status = deriveCompanyAccessStatus(usuario.company)
            if (status.blocked) {
              throw new EmpresaBloqueadaError(status.reason)
            }
          }

          try {
            after(() =>
              prisma.user
                .update({
                  where: { id: usuario.id },
                  data: { last_access: new Date() },
                })
                .catch((error) => {
                  console.error("Failed to update last_access", {
                    userId: usuario.id,
                    message: error instanceof Error ? error.message : String(error),
                  })
                }),
            )
          } catch (error) {
            console.error("Failed to schedule last_access update via after()", {
              userId: usuario.id,
              message: error instanceof Error ? error.message : String(error),
            })
          }

          return {
            id: String(usuario.id),
            email: usuario.email,
            nombre: usuario.name,
            role: usuario.role,
            empresa_id: usuario.company_id,
            empresa: usuario.company?.name ?? null,
            empresa_slug: usuario.company?.slug ?? null,
          }
        } catch (error) {
          if (
            error instanceof EmpresaBloqueadaError ||
            error instanceof CuentaPendienteActivacionError
          )
            throw error

          console.error("Credentials login failed while reading database", {
            message: error instanceof Error ? error.message : String(error),
            hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          })
          return null
        }
      },
    }),
  ],
})
