import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const rol = req.auth?.user?.rol

  if (!req.auth && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (pathname.startsWith("/superadmin") && rol !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (pathname.startsWith("/empresa") && rol !== "RH") {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (pathname.startsWith("/empleado") && rol !== "EMPLEADO") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/superadmin/:path*", "/empresa/:path*", "/empleado/:path*", "/login"],
}