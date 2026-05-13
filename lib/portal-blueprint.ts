export const architectureLayers = [
  {
    title: "Sitio publico actual",
    description:
      "WordPress en Hostinger con marketing, landing pages, blog y venta individual mediante WooCommerce.",
    accent: "teal" as const,
  },
  {
    title: "Operacion academica",
    description:
      "Tutor LMS Pro sigue siendo la fuente oficial de cursos, avance, lecciones, quizzes y constancias.",
    accent: "amber" as const,
  },
  {
    title: "Portal empresarial",
    description:
      "Next.js concentra empresas, RH, empleados, cupos, reportes y monitoreo multiempresa.",
    accent: "violet" as const,
  },
]

export const superAdminModules = [
  "Gestion de empresas y cupos",
  "Asignacion de paquetes y vigencias",
  "Reportes globales por empresa",
  "Control de accesos y sesiones",
]

export const rhModules = [
  "Resumen ejecutivo de la empresa",
  "Alta manual e importacion de empleados",
  "Seguimiento de trayectorias",
  "Descarga de constancias y reportes",
]

export const employeeModules = [
  "Mis cursos activos y pendientes",
  "Mis constancias disponibles",
  "Notificaciones de asignaciones nuevas",
]

export const routeHighlights = {
  superadmin: [
    {
      title: "Empresas activas",
      value: "12",
      description: "Clientes empresariales vigentes con acceso al portal y monitoreo centralizado.",
      accent: "teal" as const,
    },
    {
      title: "Cupos contratados",
      value: "480",
      description: "Capacidad total vendida entre los paquetes empresariales en operacion.",
      accent: "amber" as const,
    },
    {
      title: "Empresas con renovacion cercana",
      value: "3",
      description: "Renovaciones a atender durante los proximos 30 dias para evitar interrupciones.",
      accent: "violet" as const,
    },
  ],
  rh: [
    {
      title: "Empleados activos",
      value: "84",
      description: "Colaboradores dados de alta dentro del cupo disponible de la empresa.",
      accent: "violet" as const,
    },
    {
      title: "Avance promedio",
      value: "68%",
      description: "Promedio agregado de avance academico entre cursos obligatorios y optativos.",
      accent: "teal" as const,
    },
    {
      title: "Constancias emitidas",
      value: "51",
      description: "Constancias disponibles para descarga y trazabilidad por empleado.",
      accent: "amber" as const,
    },
  ],
  employee: [
    {
      title: "Cursos asignados",
      value: "6",
      description: "Cursos del paquete activo que forman parte de la ruta del empleado.",
      accent: "amber" as const,
    },
    {
      title: "Cursos completados",
      value: "4",
      description: "Cursos concluidos con evidencia suficiente para emitir constancia.",
      accent: "teal" as const,
    },
    {
      title: "Avance general",
      value: "73%",
      description: "Porcentaje acumulado de progreso dentro de la trayectoria actual.",
      accent: "violet" as const,
    },
  ],
}
