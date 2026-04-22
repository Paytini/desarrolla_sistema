import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
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
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

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
      },
    }),
  ],
})
