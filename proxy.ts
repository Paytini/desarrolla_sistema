import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const role = req.auth?.user?.role

  if (!req.auth && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (pathname.startsWith("/superadmin") && role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (pathname.startsWith("/company") && role !== "HR") {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (pathname.startsWith("/employee") && role !== "EMPLOYEE") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (
    role === "EMPLOYEE" &&
    req.auth?.user?.mustChangePassword &&
    pathname !== "/employee/cambiar-contrasena"
  ) {
    return NextResponse.redirect(new URL("/employee/cambiar-contrasena", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/superadmin/:path*", "/company/:path*", "/employee/:path*", "/login"],
}
