import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
        token.empresa_slug = (user as { empresa_slug?: string | null }).empresa_slug
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.rol = token.rol as string
      session.user.empresa_id = token.empresa_id as number | null
      session.user.nombre = token.nombre as string
      session.user.empresa = token.empresa as string | undefined
      session.user.empresa_slug = token.empresa_slug as string | undefined
      return session
    },
  },
  providers: [],
}
