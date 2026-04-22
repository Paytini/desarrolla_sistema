import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import * as dotenv from "dotenv"

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash("admin123", 12)
  const rhHash = await bcrypt.hash("rh123456", 12)
  const empleadoHash = await bcrypt.hash("empleado123", 12)

  await prisma.usuario.upsert({
    where:  { email: "admin@desarrolla360.com" },
    update: {},
    create: {
      email:         "admin@desarrolla360.com",
      password_hash: hash,
      nombre:        "SuperAdmin",
      rol:           "SUPERADMIN",
      activo:        true,
    },
  })

  const empresa = await prisma.empresa.upsert({
    where: { email_rh: "rh@empresa-demo.com" },
    update: {
      asientos_contratados: 100,
      asientos_usados: 1,
    },
    create: {
      nombre: "Empresa Demo Logistics",
      email_rh: "rh@empresa-demo.com",
      telefono: "6640000000",
      rfc: "EDL240101AAA",
      asientos_contratados: 100,
      asientos_usados: 1,
      activo: true,
      notas: "Empresa de demostracion para ambiente local.",
    },
  })

  await prisma.usuario.upsert({
    where: { email: "rh@empresa-demo.com" },
    update: {
      empresa_id: empresa.id,
    },
    create: {
      email: "rh@empresa-demo.com",
      password_hash: rhHash,
      nombre: "Responsable RH",
      rol: "RH",
      empresa_id: empresa.id,
      activo: true,
    },
  })

  await prisma.usuario.upsert({
    where: { email: "empleado@empresa-demo.com" },
    update: {
      empresa_id: empresa.id,
    },
    create: {
      email: "empleado@empresa-demo.com",
      password_hash: empleadoHash,
      nombre: "Empleado Demo",
      rol: "EMPLEADO",
      empresa_id: empresa.id,
      activo: true,
    },
  })

  const empleado = await prisma.empleado.upsert({
    where: { email: "empleado@empresa-demo.com" },
    update: {
      empresa_id: empresa.id,
      departamento: "Logistica",
      puesto: "Analista CTPAT",
    },
    create: {
      empresa_id: empresa.id,
      nombre: "Empleado",
      apellido: "Demo",
      email: "empleado@empresa-demo.com",
      departamento: "Logistica",
      puesto: "Analista CTPAT",
      activo: true,
    },
  })

  let paquete = await prisma.paquete.findFirst({
    where: { nombre: "Paquete CTPAT Empresarial" },
  })

  if (!paquete) {
    paquete = await prisma.paquete.create({
      data: {
        nombre: "Paquete CTPAT Empresarial",
        descripcion: "Paquete demo con cursos base para cumplimiento y cadena de suministro.",
        activo: true,
      },
    })
  }

  await prisma.paqueteCurso.upsert({
    where: {
      paquete_id_wp_curso_id: {
        paquete_id: paquete.id,
        wp_curso_id: 101,
      },
    },
    update: {},
    create: {
      paquete_id: paquete.id,
      wp_curso_id: 101,
      nombre_curso: "Introduccion a CTPAT",
    },
  })

  await prisma.paqueteCurso.upsert({
    where: {
      paquete_id_wp_curso_id: {
        paquete_id: paquete.id,
        wp_curso_id: 102,
      },
    },
    update: {},
    create: {
      paquete_id: paquete.id,
      wp_curso_id: 102,
      nombre_curso: "Cadena de suministro segura",
    },
  })

  const empresaPaquete = await prisma.empresaPaquete.findFirst({
    where: {
      empresa_id: empresa.id,
      paquete_id: paquete.id,
      activo: true,
    },
  })

  if (!empresaPaquete) {
    await prisma.empresaPaquete.create({
      data: {
        empresa_id: empresa.id,
        paquete_id: paquete.id,
        activo: true,
      },
    })
  }

  await prisma.empleadoCurso.upsert({
    where: {
      empleado_id_wp_curso_id: {
        empleado_id: empleado.id,
        wp_curso_id: 101,
      },
    },
    update: {
      progreso_pct: 75,
    },
    create: {
      empleado_id: empleado.id,
      wp_curso_id: 101,
      nombre_curso: "Introduccion a CTPAT",
      progreso_pct: 75,
      completado: false,
    },
  })

  await prisma.empleadoCurso.upsert({
    where: {
      empleado_id_wp_curso_id: {
        empleado_id: empleado.id,
        wp_curso_id: 102,
      },
    },
    update: {
      progreso_pct: 100,
      completado: true,
    },
    create: {
      empleado_id: empleado.id,
      wp_curso_id: 102,
      nombre_curso: "Cadena de suministro segura",
      progreso_pct: 100,
      completado: true,
      fecha_completado: new Date(),
    },
  })

  const existingConstancia = await prisma.constancia.findUnique({
    where: { folio: "D360-2026-0416-001" },
  })

  if (!existingConstancia) {
    await prisma.constancia.create({
      data: {
        empleado_id: empleado.id,
        wp_curso_id: 102,
        nombre_curso: "Cadena de suministro segura",
        folio: "D360-2026-0416-001",
        wp_cert_url: "https://www.desarrolla360.com/certificados/demo-102.pdf",
      },
    })
  }

  console.log("✅ SuperAdmin creado: admin@desarrolla360.com / admin123")
  console.log("✅ RH demo creado: rh@empresa-demo.com / rh123456")
  console.log("✅ Empleado demo creado: empleado@empresa-demo.com / empleado123")
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
