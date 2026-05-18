const csvTemplate = `nombre,apellido,email,curp,departamento,puesto,ocupacion_especifica_clave,ocupacion_especifica,password
Ana,Perez,ana@empresa.com,PEAA900101HBCXXX01,Operaciones,Supervisor,03.4,Instalacion y mantenimiento,Temporal123
Luis,Lopez,luis@empresa.com,LOPL910202HBCXXX02,Seguridad,Supervisor,07.2,Supervision de seguridad,Temporal123
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
