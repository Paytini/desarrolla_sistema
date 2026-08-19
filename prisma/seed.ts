import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcrypt"
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
  const employeeHash = await bcrypt.hash("empleado123", 12)

  await prisma.user.upsert({
    where:  { email: "admin@desarrolla360.com" },
    update: {},
    create: {
      email:         "admin@desarrolla360.com",
      password_hash: hash,
      name:          "SuperAdmin",
      role:          "SUPERADMIN",
      active:        true,
    },
  })

  const company = await prisma.company.upsert({
    where: { hr_email: "rh@empresa-demo.com" },
    update: {
      contracted_seats: 100,
      used_seats: 1,
    },
    create: {
      name: "Empresa Demo Logistics",
      slug: "empresa-demo-logistics",
      hr_email: "rh@empresa-demo.com",
      phone: "6640000000",
      rfc: "EDL240101AAA",
      contracted_seats: 100,
      used_seats: 1,
      active: true,
      notes: "Empresa de demostracion para ambiente local.",
    },
  })

  await prisma.user.upsert({
    where: { email: "rh@empresa-demo.com" },
    update: {
      company_id: company.id,
    },
    create: {
      email: "rh@empresa-demo.com",
      password_hash: rhHash,
      name: "Responsable RH",
      role: "RH",
      company_id: company.id,
      active: true,
    },
  })

  await prisma.user.upsert({
    where: { email: "empleado@empresa-demo.com" },
    update: {
      company_id: company.id,
    },
    create: {
      email: "empleado@empresa-demo.com",
      password_hash: employeeHash,
      name: "Empleado Demo",
      role: "EMPLEADO",
      company_id: company.id,
      active: true,
    },
  })

  const employee = await prisma.employee.upsert({
    where: { email: "empleado@empresa-demo.com" },
    update: {
      company_id: company.id,
      department: "Logistica",
      position: "Analista CTPAT",
    },
    create: {
      company_id: company.id,
      first_name: "Empleado",
      last_name: "Demo",
      email: "empleado@empresa-demo.com",
      department: "Logistica",
      position: "Analista CTPAT",
      active: true,
    },
  })

  let pkg = await prisma.package.findFirst({
    where: { name: "Paquete CTPAT Empresarial" },
  })

  if (!pkg) {
    pkg = await prisma.package.create({
      data: {
        name: "Paquete CTPAT Empresarial",
        description: "Paquete demo con cursos base para cumplimiento y cadena de suministro.",
        active: true,
      },
    })
  }

  await prisma.packageCourse.upsert({
    where: {
      package_id_wp_course_id: {
        package_id: pkg.id,
        wp_course_id: 101,
      },
    },
    update: {},
    create: {
      package_id: pkg.id,
      wp_course_id: 101,
      course_name: "Introduccion a CTPAT",
    },
  })

  await prisma.packageCourse.upsert({
    where: {
      package_id_wp_course_id: {
        package_id: pkg.id,
        wp_course_id: 102,
      },
    },
    update: {},
    create: {
      package_id: pkg.id,
      wp_course_id: 102,
      course_name: "Cadena de suministro segura",
    },
  })

  const companyPackage = await prisma.companyPackage.findFirst({
    where: {
      company_id: company.id,
      package_id: pkg.id,
      active: true,
    },
  })

  if (!companyPackage) {
    await prisma.companyPackage.create({
      data: {
        company_id: company.id,
        package_id: pkg.id,
        active: true,
      },
    })
  }

  await prisma.employeeCourse.upsert({
    where: {
      employee_id_wp_course_id: {
        employee_id: employee.id,
        wp_course_id: 101,
      },
    },
    update: {
      progress_pct: 75,
    },
    create: {
      employee_id: employee.id,
      wp_course_id: 101,
      course_name: "Introduccion a CTPAT",
      progress_pct: 75,
      completed: false,
    },
  })

  await prisma.employeeCourse.upsert({
    where: {
      employee_id_wp_course_id: {
        employee_id: employee.id,
        wp_course_id: 102,
      },
    },
    update: {
      progress_pct: 100,
      completed: true,
    },
    create: {
      employee_id: employee.id,
      wp_course_id: 102,
      course_name: "Cadena de suministro segura",
      progress_pct: 100,
      completed: true,
      completed_at: new Date(),
    },
  })

  const existingCertificate = await prisma.certificate.findUnique({
    where: { reference_number: "D360-2026-0416-001" },
  })

  if (!existingCertificate) {
    await prisma.certificate.create({
      data: {
        employee_id: employee.id,
        wp_course_id: 102,
        course_name: "Cadena de suministro segura",
        reference_number: "D360-2026-0416-001",
        certificate_url: "https://www.desarrolla360.com/certificados/demo-102.pdf",
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
