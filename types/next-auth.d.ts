import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      empresa_id: string | null
      nombre: string
      empresa?: string
      empresa_slug?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    empresa_id?: string | null
    nombre?: string
    empresa?: string | null
    empresa_slug?: string | null
  }
}
