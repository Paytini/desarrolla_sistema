import { unstable_cache } from "next/cache"
import {
  SUPERADMIN_ACCESOS_TAG,
  SUPERADMIN_EMPRESAS_TAG,
  SUPERADMIN_GLOBAL_TAG,
  SUPERADMIN_PAQUETES_TAG,
  SUPERADMIN_REPORTES_TAG,
  empresaAsignacionesTag,
  empresaCacheRootTag,
  empresaEmpleadosTag,
} from "@/lib/cache-tags"
import { prisma } from "@/lib/prisma"

const getSuperadminReportesSnapshotCached = unstable_cache(
  async () => {
    const empresas = await prisma.empresa.findMany({
      orderBy: { nombre: "asc" },
      include: {
        paquetes: {
          where: { activo: true },
          orderBy: { created_at: "desc" },
          include: {
            paquete: {
              select: {
                id: true,
                nombre: true,
                modo_entrega: true,
              },
            },
          },
          take: 1,
        },
        empleados: {
          select: {
            id: true,
            activo: true,
            wp_user_id: true,
            cursos: {
              select: {
                progreso_pct: true,
                completado: true,
                acceso_estado: true,
                ultima_sincronizacion: true,
              },
            },
          },
        },
      },
    })

    return { empresas }
  },
  ["dashboard-snapshot", "superadmin", "reportes"],
  {
    revalidate: 60,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_REPORTES_TAG],
  }
)

export async function getSuperadminReportesSnapshot() {
  return getSuperadminReportesSnapshotCached()
}

const getSuperadminEmpresasSnapshotCached = unstable_cache(
  async () => {
    const [empresas, paquetes] = await Promise.all([
      prisma.empresa.findMany({
        orderBy: { created_at: "desc" },
        include: {
          usuarios: {
            where: { rol: "RH" },
            select: { nombre: true, email: true, activo: true },
            take: 1,
          },
          empleados: {
            select: { id: true, activo: true },
          },
          paquetes: {
            where: { activo: true },
            orderBy: { created_at: "desc" },
            include: {
              paquete: {
                select: { nombre: true },
              },
            },
            take: 1,
          },
        },
      }),
      prisma.paquete.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
      }),
    ])

    return { empresas, paquetes }
  },
  ["dashboard-snapshot", "superadmin", "empresas"],
  {
    revalidate: 90,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_EMPRESAS_TAG],
  }
)

export async function getSuperadminEmpresasSnapshot() {
  return getSuperadminEmpresasSnapshotCached()
}

const getSuperadminPaquetesSnapshotCached = unstable_cache(
  async () => {
    const [paquetes, empresas] = await Promise.all([
      prisma.paquete.findMany({
        orderBy: { created_at: "desc" },
        include: {
          cursos: {
            orderBy: { wp_curso_id: "asc" },
          },
          empresas: {
            where: { activo: true },
            include: {
              empresa: {
                select: { nombre: true },
              },
            },
          },
        },
      }),
      prisma.empresa.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
        include: {
          paquetes: {
            where: { activo: true },
            orderBy: { created_at: "desc" },
            include: {
              paquete: {
                select: { nombre: true },
              },
            },
            take: 1,
          },
          empleados: {
            where: { activo: true },
            select: { id: true, wp_user_id: true },
          },
        },
      }),
    ])

    return { paquetes, empresas }
  },
  ["dashboard-snapshot", "superadmin", "paquetes"],
  {
    revalidate: 90,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_PAQUETES_TAG],
  }
)

export async function getSuperadminPaquetesSnapshot() {
  return getSuperadminPaquetesSnapshotCached()
}

const getSuperadminAccesosSnapshotCached = unstable_cache(
  async () => {
    const [rhUsers, employeeUsers, employees] = await Promise.all([
      prisma.usuario.findMany({
        where: { rol: "RH" },
        orderBy: [{ activo: "desc" }, { created_at: "desc" }],
        select: {
          id: true,
          nombre: true,
          email: true,
          activo: true,
          ultimo_acceso: true,
          created_at: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
              activo: true,
              asientos_contratados: true,
              asientos_usados: true,
            },
          },
        },
      }),
      prisma.usuario.findMany({
        where: { rol: "EMPLEADO" },
        select: {
          id: true,
          email: true,
          activo: true,
          ultimo_acceso: true,
        },
      }),
      prisma.empleado.findMany({
        orderBy: [{ activo: "desc" }, { created_at: "desc" }],
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          activo: true,
          wp_user_id: true,
          created_at: true,
          empresa: {
            select: {
              nombre: true,
              activo: true,
            },
          },
        },
        take: 18,
      }),
    ])

    return { rhUsers, employeeUsers, employees }
  },
  ["dashboard-snapshot", "superadmin", "accesos"],
  {
    revalidate: 45,
    tags: [SUPERADMIN_GLOBAL_TAG, SUPERADMIN_ACCESOS_TAG],
  }
)

export async function getSuperadminAccesosSnapshot() {
  return getSuperadminAccesosSnapshotCached()
}

export async function getRhEmpleadosSnapshot(empresaId: number) {
  const snapshot = unstable_cache(
    async () =>
      prisma.empresa.findUnique({
        where: { id: empresaId },
        include: {
          empleados: {
            include: {
              cursos: {
                select: {
                  acceso_estado: true,
                },
              },
            },
            orderBy: { created_at: "desc" },
          },
          paquetes: {
            where: { activo: true },
            orderBy: { created_at: "desc" },
            include: {
              paquete: {
                select: { nombre: true },
              },
            },
            take: 1,
          },
        },
      }),
    ["dashboard-snapshot", "empresa", "empleados", String(empresaId)],
    {
      revalidate: 45,
      tags: [empresaCacheRootTag(empresaId), empresaEmpleadosTag(empresaId)],
    }
  )

  return snapshot()
}

export async function getRhAsignacionesSnapshot(empresaId: number) {
  const snapshot = unstable_cache(
    async () =>
      prisma.empresa.findUnique({
        where: { id: empresaId },
        include: {
          paquetes: {
            where: { activo: true },
            orderBy: { created_at: "desc" },
            include: {
              paquete: {
                include: {
                  cursos: {
                    orderBy: { nombre_curso: "asc" },
                  },
                },
              },
            },
            take: 1,
          },
          empleados: {
            where: { activo: true },
            include: {
              cursos: {
                select: {
                  wp_curso_id: true,
                },
              },
            },
            orderBy: [{ departamento: "asc" }, { nombre: "asc" }],
          },
        },
      }),
    ["dashboard-snapshot", "empresa", "asignaciones", String(empresaId)],
    {
      revalidate: 45,
      tags: [empresaCacheRootTag(empresaId), empresaAsignacionesTag(empresaId)],
    }
  )

  return snapshot()
}
