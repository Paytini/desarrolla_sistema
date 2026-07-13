import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      rol: string
      empresa_id: number | null
      nombre: string
      empresa?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    rol?: string
    empresa_id?: number | null
    nombre?: string
    empresa?: string | null
  }
}
