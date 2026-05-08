const csvTemplate = `nombre,apellido,email,departamento,puesto,password
Ana,Perez,ana@empresa.com,Operaciones,Supervisor,Temporal123
Luis,Lopez,luis@empresa.com,Seguridad,Supervisor,Temporal123
`

export async function GET() {
  return new Response(csvTemplate, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-empleados.csv"',
      "Cache-Control": "no-store",
    },
  })
}
