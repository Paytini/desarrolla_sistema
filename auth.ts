import NextAuth from "next-auth"
import { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { getEmpresaAccessStatus } from "@/lib/empresa-status"

class EmpresaBloqueadaError extends CredentialsSignin {
  constructor(reason: "suspendida" | "vencida") {
    super()
    this.code = reason === "suspendida" ? "empresa_suspendida" : "empresa_vencida"
  }
}

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
if (!authSecret) {
  throw new Error("AUTH_SECRET (o NEXTAUTH_SECRET) es requerida. Configura la variable de entorno antes de iniciar.")
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  secret: authSecret,
  trustHost: true,
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = (user as { rol?: string }).rol
        token.empresa_id = (user as { empresa_id?: number | null }).empresa_id
        token.nombre = (user as { nombre?: string }).nombre
        token.empresa = (user as { empresa?: string | null }).empresa
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.rol = token.rol as string
      session.user.empresa_id = token.empresa_id as number | null
      session.user.nombre = token.nombre as string
      session.user.empresa = token.empresa as string | undefined
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email:          { label: "Email",          type: "email" },
        password:       { label: "Password",       type: "password" },
        turnstileToken: { label: "Turnstile Token", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        const captchaValid = await verifyTurnstileToken(
          credentials.turnstileToken as string | undefined,
          remoteIp
        )
        if (!captchaValid) return null

        try {
          const usuario = await prisma.usuario.findUnique({
            where: { email: credentials.email as string },
            include: {
              empresa: {
                select: { nombre: true },
              },
            },
          })

          if (!usuario || !usuario.activo) return null

          const valida = await bcrypt.compare(
            credentials.password as string,
            usuario.password_hash
          )
          if (!valida) return null

          if (usuario.rol !== "SUPERADMIN" && usuario.empresa_id) {
            const status = await getEmpresaAccessStatus(usuario.empresa_id)
            if (status.blocked) {
              throw new EmpresaBloqueadaError(status.reason)
            }
          }

          await prisma.usuario.update({
            where: { id: usuario.id },
            data:  { ultimo_acceso: new Date() },
          })

          return {
            id: String(usuario.id),
            email: usuario.email,
            nombre: usuario.nombre,
            rol: usuario.rol,
            empresa_id: usuario.empresa_id,
            empresa: usuario.empresa?.nombre ?? null,
          }
        } catch (error) {
          if (error instanceof EmpresaBloqueadaError) throw error

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
