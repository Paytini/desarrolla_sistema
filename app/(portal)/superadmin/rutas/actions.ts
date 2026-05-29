"use server"

import { requireSuperAdminSession } from "@/lib/auth-guards"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type CursoInput = { wp_curso_id: number; nombre_curso: string; orden: number }

function parseCursosJson(formData: FormData): CursoInput[] {
  try {
    const raw = formData.get("cursosJson")
    const parsed = JSON.parse(String(raw ?? "[]"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseEmpresaIdsJson(formData: FormData): number[] {
  try {
    const raw = formData.get("empresaIdsJson")
    const parsed = JSON.parse(String(raw ?? "[]"))
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : []
  } catch {
    return []
  }
}

export async function createRuta(formData: FormData) {
  await requireSuperAdminSession()

  const nombre = String(formData.get("nombre") ?? "").trim()
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null
  const cursos = parseCursosJson(formData)
  const empresaIds = parseEmpresaIdsJson(formData)

  if (!nombre) redirect("/superadmin/rutas/nueva?error=nombre")

  await prisma.$transaction(async (tx) => {
    const ruta = await tx.rutaAprendizaje.create({
      data: {
        nombre,
        descripcion,
        cursos: {
          create: cursos.map((c) => ({
            wp_curso_id: c.wp_curso_id,
            nombre_curso: c.nombre_curso,
            orden: c.orden,
          })),
        },
      },
    })
    if (empresaIds.length > 0) {
      await tx.empresa.updateMany({
        where: { id: { in: empresaIds } },
        data: { ruta_aprendizaje_id: ruta.id },
      })
    }
  })

  revalidatePath("/superadmin/rutas")
  redirect("/superadmin/rutas?success=creada")
}

export async function updateRuta(id: number, formData: FormData) {
  await requireSuperAdminSession()

  const nombre = String(formData.get("nombre") ?? "").trim()
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null
  const activo = formData.get("activo") === "true"
  const cursos = parseCursosJson(formData)
  const empresaIds = parseEmpresaIdsJson(formData)

  if (!nombre) redirect(`/superadmin/rutas/${id}/editar?error=nombre`)

  await prisma.$transaction(async (tx) => {
    await tx.rutaCurso.deleteMany({ where: { ruta_id: id } })
    await tx.rutaAprendizaje.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        activo,
        cursos: {
          create: cursos.map((c) => ({
            wp_curso_id: c.wp_curso_id,
            nombre_curso: c.nombre_curso,
            orden: c.orden,
          })),
        },
      },
    })
    // Quitar la ruta de empresas que ya no están en la lista
    await tx.empresa.updateMany({
      where: { ruta_aprendizaje_id: id, id: { notIn: empresaIds } },
      data: { ruta_aprendizaje_id: null },
    })
    // Asignar ruta a las empresas seleccionadas
    if (empresaIds.length > 0) {
      await tx.empresa.updateMany({
        where: { id: { in: empresaIds } },
        data: { ruta_aprendizaje_id: id },
      })
    }
  })

  revalidatePath("/superadmin/rutas")
  redirect("/superadmin/rutas?success=actualizada")
}

export async function deleteRuta(id: number, _formData: FormData) {
  await requireSuperAdminSession()

  const count = await prisma.empresa.count({ where: { ruta_aprendizaje_id: id } })
  if (count > 0) redirect(`/superadmin/rutas/${id}/editar?error=tiene_empresas`)

  await prisma.rutaAprendizaje.delete({ where: { id } })

  revalidatePath("/superadmin/rutas")
  redirect("/superadmin/rutas?success=eliminada")
}
