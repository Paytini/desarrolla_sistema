import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Documentación API — Desarrolla360</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "/api/internal/openapi-spec",
          dom_id: "#swagger-ui",
        })
      }
    </script>
  </body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  })
}
