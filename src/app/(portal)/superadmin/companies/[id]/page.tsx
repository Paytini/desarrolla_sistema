import { amber, green, portalColors, red, slate } from "@/lib/theme-tokens"
import { PanelBox } from "@/components/superadmin/PanelBox"
import { SeatDonut } from "@/components/superadmin/SeatDonut"
import { CompanyBrandingForm } from "@/components/superadmin/CompanyBrandingForm"
import { updateCompanyBrandingAction } from "../actions"
import { formatDate, formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { readSearchParam } from "@/lib/search-params"
import { paginate } from "@/lib/pagination"
import { isUuid } from "@/lib/uuid"
import { ArrowLeft, Calendar, Mail, Phone, User } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { Pagination } from "@/components/shared/Pagination"
import { DataTable } from "@/components/shared/DataTable"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import Typography from "@mui/material/Typography"

const brandingSuccessMessages: Record<string, string> = {
  marca_actualizada: "Logo actualizado correctamente.",
}

function DonutChart({ pct, size = 160 }: { pct: number; size?: number }) {
  const sw = 14
  const r = (size - sw) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 75 ? portalColors.navy : pct >= 40 ? amber[600] : red[600]
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={slate[100]} strokeWidth={sw} />
      {pct > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      <text
        x={cx}
        y={cy - 7}
        textAnchor="middle"
        fill={slate[900]}
        fontSize={size * 0.17}
        fontWeight="600"
      >
        {pct === 0 ? "—" : `${pct}%`}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill={slate[400]} fontSize={size * 0.08}>
        avance gbl.
      </text>
    </svg>
  )
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function progressColor(pct: number) {
  return pct >= 75 ? portalColors.navy : pct >= 40 ? amber[600] : red[600]
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CompanyDetailPage({ params, searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") redirect("/login")

  const { id } = await params
  const companyId = id
  if (!isUuid(companyId)) notFound()

  const query = await searchParams
  const success = readSearchParam(query, "success")
  const detailPage = Math.max(1, Number(readSearchParam(query, "dpage") ?? "1"))

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      employees: {
        include: {
          courses: { orderBy: { course_name: "asc" } },
          certificates: true,
        },
        orderBy: { first_name: "asc" },
      },
      packages: {
        include: {
          package: {
            include: { courses: { select: { wp_course_id: true, course_name: true } } },
          },
        },
        orderBy: { created_at: "desc" },
      },
      users: {
        where: { role: "HR" },
        select: { name: true, email: true },
        take: 1,
      },
    },
  })
  if (!company) notFound()

  const activeEmployees = company.employees.filter((e) => e.active)
  const allCourses = company.employees.flatMap((e) => e.courses)
  const allCertificates = company.employees.flatMap((e) => e.certificates)
  const avgProgress = allCourses.length
    ? Math.round(allCourses.reduce((s, c) => s + c.progress_pct, 0) / allCourses.length)
    : 0

  const activePackage = company.packages.find((p) => p.active) ?? company.packages[0] ?? null
  const packageCourses = activePackage?.package?.courses ?? []

  const employeeStats = activeEmployees
    .map((e) => {
      const avg = e.courses.length
        ? Math.round(e.courses.reduce((s, c) => s + c.progress_pct, 0) / e.courses.length)
        : 0
      const completed = e.courses.filter((c) => c.completed).length
      const hasError = e.courses.some((c) => c.access_status === "ERROR")
      const lastSync = [...e.courses].sort(
        (a, b) => new Date(b.last_synced_at).getTime() - new Date(a.last_synced_at).getTime(),
      )[0]?.last_synced_at
      return {
        ...e,
        avg,
        completed,
        total: e.courses.length,
        certificatesCount: e.certificates.length,
        hasError,
        lastSync,
      }
    })
    .sort((a, b) => b.avg - a.avg)

  const DETAIL_PAGE_SIZE = 8
  const {
    items: pagedEmployeeDetails,
    currentPage: detailCurrentPage,
    totalPages: detailTotalPages,
    totalResults: detailTotalResults,
  } = paginate(employeeStats, detailPage, DETAIL_PAGE_SIZE)

  function detailPageUrl(p: number) {
    const qs = new URLSearchParams()
    if (p > 1) qs.set("dpage", String(p))
    const str = qs.toString()
    return `/superadmin/companies/${companyId}${str ? `?${str}` : ""}#detalle-empleados`
  }

  const courseStats = packageCourses.map((pc) => {
    const assigned = allCourses.filter((c) => c.wp_course_id === pc.wp_course_id)
    const completed = assigned.filter((c) => c.completed).length
    const inProgress = assigned.filter((c) => !c.completed && c.progress_pct > 0).length
    const notStarted = assigned.filter((c) => c.progress_pct === 0).length
    const avgPct = assigned.length
      ? Math.round(assigned.reduce((s, c) => s + c.progress_pct, 0) / assigned.length)
      : 0
    return { ...pc, assigned: assigned.length, completed, inProgress, notStarted, avgPct }
  })

  const hrContact = company.users[0]
  const seatPct = company.contracted_seats
    ? Math.round((company.used_seats / company.contracted_seats) * 100)
    : 0

  return (
    <Box sx={{ display: "grid", gap: 2.5 }}>
      {success && (
        <DismissibleAlert severity="success">
          {brandingSuccessMessages[success] ?? success}
        </DismissibleAlert>
      )}

      <Box sx={{ display: "grid", gap: 1.5 }}>
        <Link
          href="/superadmin/companies"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: slate[500],
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={12} strokeWidth={2.5} />
          Empresas
        </Link>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 600, color: slate[900] }}>
                {company.name}
              </Typography>
              <Chip
                label={
                  <Box
                    component="span"
                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: company.active ? green[500] : slate[300],
                        flexShrink: 0,
                      }}
                    />
                    {company.active ? "Activa" : "Suspendida"}
                  </Box>
                }
                size="small"
                sx={{
                  height: 24,
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "1px solid",
                  borderColor: company.active ? green[200] : slate[200],
                  bgcolor: company.active ? green[50] : slate[50],
                  color: company.active ? green[600] : slate[500],
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            </Box>
            <Box
              sx={{
                mt: 1,
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                fontSize: 12,
                color: slate[400],
              }}
            >
              {company.rfc && (
                <Box
                  component="span"
                  sx={{ fontFamily: "monospace", fontWeight: 500, color: slate[600] }}
                >
                  {company.rfc}
                </Box>
              )}
              <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Mail size={11} />
                {company.hr_email}
              </Box>
              {company.phone && (
                <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Phone size={11} />
                  {company.phone}
                </Box>
              )}
              <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Calendar size={11} />
                Alta {formatDate(company.created_at)}
              </Box>
              {hrContact && (
                <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <User size={11} />
                  {hrContact.name}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: slate[100] }} />

      <Box
        sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "180px 1fr 180px" } }}
      >
        <PanelBox title="Avance">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              px: 2,
              pb: 2,
            }}
          >
            <DonutChart pct={avgProgress} size={150} />
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gap: 1,
                pt: 1,
                textAlign: "center",
                borderTop: `1px solid ${slate[100]}`,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 22,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    color: slate[900],
                  }}
                >
                  {activeEmployees.length}
                  <Box
                    component="span"
                    sx={{ ml: 0.5, fontSize: 13, fontWeight: 400, color: slate[400] }}
                  >
                    / {company.contracted_seats}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: 11, color: slate[400] }}>empleados activos</Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: 22,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    color: slate[900],
                  }}
                >
                  {allCertificates.length}
                </Typography>
                <Typography sx={{ fontSize: 11, color: slate[400] }}>
                  constancias emitidas
                </Typography>
              </Box>
            </Box>
          </Box>
        </PanelBox>

        {courseStats.length > 0 && (
          <PanelBox
            title="Avance por curso"
            action={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  fontSize: "10px",
                  color: slate[400],
                }}
              >
                {[
                  { color: portalColors.navy, label: "Completado" },
                  { color: amber[400], label: "En curso" },
                  { color: slate[100], label: "Pendiente" },
                ].map(({ color, label }) => (
                  <Box
                    key={label}
                    component="span"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      fontSize: "10px",
                      color: slate[400],
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: 0.5,
                        bgcolor: color,
                      }}
                    />
                    {label}
                  </Box>
                ))}
              </Box>
            }
          >
            <Box sx={{ display: "grid", gap: 2, p: 2.5 }}>
              {courseStats.map((c) => {
                const cPct = c.assigned ? (c.completed / c.assigned) * 100 : 0
                const iPct = c.assigned ? (c.inProgress / c.assigned) * 100 : 0
                return (
                  <Box key={c.wp_course_id}>
                    <Box
                      sx={{
                        mb: 0.75,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: slate[700],
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.course_name}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexShrink: 0,
                          alignItems: "center",
                          gap: 1.5,
                          fontSize: 11,
                          color: slate[400],
                        }}
                      >
                        <Typography
                          sx={{ fontSize: 11, fontWeight: 600, color: portalColors.navy }}
                        >
                          {c.completed} compl.
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: slate[400] }}>
                          {c.inProgress} en curso
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: slate[400] }}>
                          {c.notStarted} pend.
                        </Typography>
                        {c.assigned > 0 && (
                          <Typography sx={{ fontSize: 11, fontWeight: 600, color: slate[600] }}>
                            {c.avgPct}% avg
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {c.assigned > 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          height: 10,
                          overflow: "hidden",
                          borderRadius: "999px",
                          bgcolor: slate[100],
                        }}
                      >
                        <Box sx={{ bgcolor: portalColors.navy, width: `${cPct}%` }} />
                        <Box sx={{ bgcolor: amber[400], width: `${iPct}%` }} />
                      </Box>
                    ) : (
                      <Box sx={{ height: 10, borderRadius: "999px", bgcolor: slate[100] }} />
                    )}
                    {c.assigned === 0 && (
                      <Typography sx={{ mt: 0.25, fontSize: 11, color: slate[400] }}>
                        Sin empleados asignados
                      </Typography>
                    )}
                  </Box>
                )
              })}
            </Box>
          </PanelBox>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <PanelBox title="Cupos">
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <SeatDonut used={company.used_seats} total={company.contracted_seats} />
                <Box sx={{ display: "grid", gap: 0.5, fontSize: 12, color: slate[500] }}>
                  <Typography sx={{ fontSize: 12, color: slate[500] }}>
                    <Box component="span" sx={{ fontWeight: 600, color: slate[900] }}>
                      {company.used_seats}
                    </Box>{" "}
                    en uso
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: slate[500] }}>
                    <Box component="span" sx={{ fontWeight: 600, color: slate[900] }}>
                      {Math.max(company.contracted_seats - company.used_seats, 0)}
                    </Box>{" "}
                    disponibles
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: slate[500] }}>
                    <Box component="span" sx={{ fontWeight: 600, color: slate[900] }}>
                      {company.contracted_seats}
                    </Box>{" "}
                    contratados
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  mt: 1.5,
                  height: 6,
                  overflow: "hidden",
                  borderRadius: "999px",
                  bgcolor: slate[100],
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    borderRadius: "999px",
                    bgcolor:
                      seatPct >= 90 ? red[600] : seatPct >= 70 ? amber[600] : portalColors.navy,
                    width: `${seatPct}%`,
                  }}
                />
              </Box>
            </Box>
          </PanelBox>

          <PanelBox title="Paquete activo">
            <Box sx={{ p: 2 }}>
              {activePackage ? (
                <>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: slate[900] }}>
                    {activePackage.package?.name ?? "—"}
                  </Typography>
                  <Box sx={{ mt: 1, display: "grid", gap: 0.5, fontSize: 12, color: slate[400] }}>
                    <Typography sx={{ fontSize: 12, color: slate[400] }}>
                      Inicio: {formatDate(activePackage.start_date)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: slate[400] }}>
                      Vence:{" "}
                      {activePackage.expiration_date
                        ? formatDate(activePackage.expiration_date)
                        : "Sin vencimiento"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: slate[400] }}>
                      {packageCourses.length} cursos incluidos
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography sx={{ fontSize: 12, color: slate[400] }}>
                  Sin paquete asignado
                </Typography>
              )}
            </Box>
          </PanelBox>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "320px 1fr" } }}>
        <PanelBox
          title="Logotipo de la empresa"
          description="Logo que observará esta empresa dentro del portal"
        >
          <CompanyBrandingForm
            companyId={company.id}
            currentLogoUrl={company.logo_url}
            action={updateCompanyBrandingAction}
          />
        </PanelBox>

        <PanelBox
          id="detalle-empleados"
          title="Detalle de empleados"
          count={activeEmployees.length}
          description={
            company.employees.length - activeEmployees.length > 0
              ? `${company.employees.length - activeEmployees.length} suspendidos`
              : undefined
          }
          noPadding
        >
          <div className="px-2">
            <DataTable
              ariaLabel="Detalle de empleados"
              columns={[
                { label: "Empleado" },
                { label: "Progreso" },
                { label: "Cursos" },
                { label: "Constancias" },
                { label: "WP sync" },
                { label: "Última sync" },
              ]}
              rows={pagedEmployeeDetails.map((e) => (
                <tr
                  key={e.id}
                  className={
                    e.hasError
                      ? "bg-red-50/40 transition-colors hover:bg-slate-50/50"
                      : "bg-white transition-colors hover:bg-gray-50"
                  }
                >
                  <td className="rounded-l-lg px-4 py-3">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          flexShrink: 0,
                          borderRadius: 1,
                          fontSize: "10px",
                          fontWeight: 700,
                          ...(e.hasError
                            ? { bgcolor: red[50], color: red[600] }
                            : { bgcolor: portalColors.navySoft, color: portalColors.navy }),
                        }}
                      >
                        {getInitials(e.first_name, e.last_name)}
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: slate[900] }}>
                          {e.first_name} {e.last_name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: slate[400] }}>{e.email}</Typography>
                      </Box>
                    </Box>
                  </td>
                  <td className="px-4 py-3">
                    <Box sx={{ width: 96 }}>
                      <Box
                        sx={{
                          height: 6,
                          overflow: "hidden",
                          borderRadius: "999px",
                          bgcolor: slate[100],
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            borderRadius: "999px",
                            bgcolor: progressColor(e.avg),
                            width: `${e.avg}%`,
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          mt: 0.25,
                          textAlign: "right",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: slate[500],
                        }}
                      >
                        {e.avg}%
                      </Typography>
                    </Box>
                  </td>
                  <td className="px-4 py-3">
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        color: slate[900],
                      }}
                    >
                      {e.completed}/{e.total}
                    </Typography>
                  </td>
                  <td className="px-4 py-3">
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        color: slate[900],
                      }}
                    >
                      {e.certificatesCount}
                    </Typography>
                  </td>
                  <td className="px-4 py-3">
                    {e.hasError ? (
                      <Chip
                        label="Error"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          border: `1px solid ${red[200]}`,
                          bgcolor: red[50],
                          color: red[600],
                          "& .MuiChip-label": { px: 1 },
                        }}
                      />
                    ) : e.wp_user_id ? (
                      <Chip
                        label="Sincronizado"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          border: `1px solid ${green[200]}`,
                          bgcolor: green[50],
                          color: green[600],
                          "& .MuiChip-label": { px: 1 },
                        }}
                      />
                    ) : (
                      <Chip
                        label="Sin WP ID"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          border: `1px solid ${slate[200]}`,
                          bgcolor: slate[50],
                          color: slate[500],
                          "& .MuiChip-label": { px: 1 },
                        }}
                      />
                    )}
                  </td>
                  <td className="rounded-r-lg px-4 py-3">
                    <Typography sx={{ fontFamily: "monospace", fontSize: 11, color: slate[400] }}>
                      {e.lastSync ? formatDateTime(e.lastSync) : "—"}
                    </Typography>
                  </td>
                </tr>
              ))}
              emptyState={{ message: "Sin empleados activos registrados." }}
            />
          </div>
          <Pagination
            currentPage={detailCurrentPage}
            totalPages={detailTotalPages}
            totalResults={detailTotalResults}
            buildPageUrl={detailPageUrl}
          />
        </PanelBox>
      </Box>

      {company.notes && (
        <PanelBox title="Notas internas">
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 13, color: slate[600] }}>{company.notes}</Typography>
          </Box>
        </PanelBox>
      )}
    </Box>
  )
}
