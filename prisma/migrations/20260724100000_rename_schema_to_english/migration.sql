-- Rename schema to English.
-- Every statement below is a metadata-only rename (ALTER ... RENAME).
-- No data is copied, dropped, or rewritten by any statement in this file.

-- Enum type
ALTER TYPE "Rol" RENAME TO "Role";

-- usuarios -> users
ALTER TABLE "usuarios" RENAME COLUMN "rol" TO "role";
ALTER TABLE "usuarios" RENAME COLUMN "nombre" TO "name";
ALTER TABLE "usuarios" RENAME COLUMN "empresa_id" TO "company_id";
ALTER TABLE "usuarios" RENAME COLUMN "activo" TO "active";
ALTER TABLE "usuarios" RENAME COLUMN "ultimo_acceso" TO "last_access";
ALTER TABLE "usuarios" RENAME TO "users";

-- notificaciones -> notifications
ALTER TABLE "notificaciones" RENAME COLUMN "usuario_id" TO "user_id";
ALTER TABLE "notificaciones" RENAME COLUMN "tipo" TO "type";
ALTER TABLE "notificaciones" RENAME COLUMN "titulo" TO "title";
ALTER TABLE "notificaciones" RENAME COLUMN "mensaje" TO "message";
ALTER TABLE "notificaciones" RENAME COLUMN "leida" TO "read";
ALTER TABLE "notificaciones" RENAME COLUMN "entidad_tipo" TO "entity_type";
ALTER TABLE "notificaciones" RENAME COLUMN "entidad_id" TO "entity_id";
ALTER TABLE "notificaciones" RENAME TO "notifications";

-- empresas -> companies
ALTER TABLE "empresas" RENAME COLUMN "nombre" TO "name";
ALTER TABLE "empresas" RENAME COLUMN "email_rh" TO "hr_email";
ALTER TABLE "empresas" RENAME COLUMN "telefono" TO "phone";
ALTER TABLE "empresas" RENAME COLUMN "asientos_contratados" TO "contracted_seats";
ALTER TABLE "empresas" RENAME COLUMN "asientos_usados" TO "used_seats";
ALTER TABLE "empresas" RENAME COLUMN "activo" TO "active";
ALTER TABLE "empresas" RENAME COLUMN "notas" TO "notes";
ALTER TABLE "empresas" RENAME TO "companies";

-- paquetes -> packages
ALTER TABLE "paquetes" RENAME COLUMN "nombre" TO "name";
ALTER TABLE "paquetes" RENAME COLUMN "descripcion" TO "description";
ALTER TABLE "paquetes" RENAME COLUMN "modo_entrega" TO "delivery_mode";
ALTER TABLE "paquetes" RENAME COLUMN "nombre_bundle" TO "bundle_name";
ALTER TABLE "paquetes" RENAME COLUMN "notas_operativas" TO "operational_notes";
ALTER TABLE "paquetes" RENAME COLUMN "activo" TO "active";
ALTER TABLE "paquetes" RENAME TO "packages";

-- paquete_cursos -> package_courses
ALTER TABLE "paquete_cursos" RENAME COLUMN "paquete_id" TO "package_id";
ALTER TABLE "paquete_cursos" RENAME COLUMN "wp_curso_id" TO "wp_course_id";
ALTER TABLE "paquete_cursos" RENAME COLUMN "nombre_curso" TO "course_name";
ALTER TABLE "paquete_cursos" RENAME COLUMN "portada_url" TO "cover_url";
ALTER TABLE "paquete_cursos" RENAME COLUMN "descripcion" TO "description";
ALTER TABLE "paquete_cursos" RENAME COLUMN "num_lecciones" TO "lesson_count";
ALTER TABLE "paquete_cursos" RENAME TO "package_courses";

-- curso_dc3_metadata -> course_dc3_metadata
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "wp_curso_id" TO "wp_course_id";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "nombre_curso" TO "course_name";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "duracion_horas" TO "duration_hours";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "area_tematica_nombre" TO "subject_area_name";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "area_tematica_clave" TO "subject_area_code";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "agente_capacitador_nombre" TO "training_agent_name";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "agente_capacitador_registro" TO "training_agent_registration";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "instructor_nombre" TO "instructor_name";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "instructor_firma_url" TO "instructor_signature_url";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "fuente" TO "source";
ALTER TABLE "curso_dc3_metadata" RENAME COLUMN "ultima_sincronizacion" TO "last_synced_at";
ALTER TABLE "curso_dc3_metadata" RENAME TO "course_dc3_metadata";

-- empresa_paquetes -> company_packages
ALTER TABLE "empresa_paquetes" RENAME COLUMN "empresa_id" TO "company_id";
ALTER TABLE "empresa_paquetes" RENAME COLUMN "paquete_id" TO "package_id";
ALTER TABLE "empresa_paquetes" RENAME COLUMN "fecha_inicio" TO "start_date";
ALTER TABLE "empresa_paquetes" RENAME COLUMN "fecha_vencimiento" TO "expiration_date";
ALTER TABLE "empresa_paquetes" RENAME COLUMN "activo" TO "active";
ALTER TABLE "empresa_paquetes" RENAME TO "company_packages";

-- empleados -> employees
ALTER TABLE "empleados" RENAME COLUMN "empresa_id" TO "company_id";
ALTER TABLE "empleados" RENAME COLUMN "nombre" TO "first_name";
ALTER TABLE "empleados" RENAME COLUMN "apellido" TO "last_name";
ALTER TABLE "empleados" RENAME COLUMN "apellido_materno" TO "second_last_name";
ALTER TABLE "empleados" RENAME COLUMN "departamento" TO "department";
ALTER TABLE "empleados" RENAME COLUMN "puesto" TO "position";
ALTER TABLE "empleados" RENAME COLUMN "ocupacion_especifica_clave" TO "occupation_code";
ALTER TABLE "empleados" RENAME COLUMN "ocupacion_especifica" TO "occupation_name";
ALTER TABLE "empleados" RENAME COLUMN "activo" TO "active";
ALTER TABLE "empleados" RENAME TO "employees";

-- empleado_cursos -> employee_courses
ALTER TABLE "empleado_cursos" RENAME COLUMN "empleado_id" TO "employee_id";
ALTER TABLE "empleado_cursos" RENAME COLUMN "wp_curso_id" TO "wp_course_id";
ALTER TABLE "empleado_cursos" RENAME COLUMN "nombre_curso" TO "course_name";
ALTER TABLE "empleado_cursos" RENAME COLUMN "progreso_pct" TO "progress_pct";
ALTER TABLE "empleado_cursos" RENAME COLUMN "completado" TO "completed";
ALTER TABLE "empleado_cursos" RENAME COLUMN "acceso_estado" TO "access_status";
ALTER TABLE "empleado_cursos" RENAME COLUMN "acceso_origen" TO "access_source";
ALTER TABLE "empleado_cursos" RENAME COLUMN "acceso_error" TO "access_error";
ALTER TABLE "empleado_cursos" RENAME COLUMN "ultimo_intento_acceso" TO "last_access_attempt";
ALTER TABLE "empleado_cursos" RENAME COLUMN "fecha_inicio_curso" TO "course_start_date";
ALTER TABLE "empleado_cursos" RENAME COLUMN "fecha_completado" TO "completed_at";
ALTER TABLE "empleado_cursos" RENAME COLUMN "ultima_sincronizacion" TO "last_synced_at";
ALTER TABLE "empleado_cursos" RENAME TO "employee_courses";

-- constancias -> certificates
ALTER TABLE "constancias" RENAME COLUMN "empleado_id" TO "employee_id";
ALTER TABLE "constancias" RENAME COLUMN "wp_curso_id" TO "wp_course_id";
ALTER TABLE "constancias" RENAME COLUMN "nombre_curso" TO "course_name";
ALTER TABLE "constancias" RENAME COLUMN "folio" TO "reference_number";
ALTER TABLE "constancias" RENAME COLUMN "wp_cert_url" TO "certificate_url";
ALTER TABLE "constancias" RENAME COLUMN "fecha_emision" TO "issued_at";
ALTER TABLE "constancias" RENAME TO "certificates";

-- integracion_estados -> integration_states
ALTER TABLE "integracion_estados" RENAME COLUMN "clave" TO "key";
ALTER TABLE "integracion_estados" RENAME TO "integration_states";

-- sesiones_portal -> portal_sessions
ALTER TABLE "sesiones_portal" RENAME COLUMN "usuario_id" TO "user_id";
ALTER TABLE "sesiones_portal" RENAME COLUMN "expira_en" TO "expires_at";
ALTER TABLE "sesiones_portal" RENAME TO "portal_sessions";

-- auditoria_eventos -> audit_events
ALTER TABLE "auditoria_eventos" RENAME COLUMN "actor_usuario_id" TO "actor_user_id";
ALTER TABLE "auditoria_eventos" RENAME COLUMN "actor_nombre" TO "actor_name";
ALTER TABLE "auditoria_eventos" RENAME COLUMN "actor_rol" TO "actor_role";
ALTER TABLE "auditoria_eventos" RENAME COLUMN "accion" TO "action";
ALTER TABLE "auditoria_eventos" RENAME COLUMN "entidad_tipo" TO "entity_type";
ALTER TABLE "auditoria_eventos" RENAME COLUMN "entidad_id" TO "entity_id";
ALTER TABLE "auditoria_eventos" RENAME COLUMN "empresa_id" TO "company_id";
ALTER TABLE "auditoria_eventos" RENAME COLUMN "resumen" TO "summary";
ALTER TABLE "auditoria_eventos" RENAME TO "audit_events";

-- historial_cupos -> seat_history
ALTER TABLE "historial_cupos" RENAME COLUMN "empresa_id" TO "company_id";
ALTER TABLE "historial_cupos" RENAME COLUMN "actor_usuario_id" TO "actor_user_id";
ALTER TABLE "historial_cupos" RENAME COLUMN "actor_nombre" TO "actor_name";
ALTER TABLE "historial_cupos" RENAME COLUMN "actor_rol" TO "actor_role";
ALTER TABLE "historial_cupos" RENAME COLUMN "motivo" TO "reason";
ALTER TABLE "historial_cupos" RENAME COLUMN "detalle" TO "detail";
ALTER TABLE "historial_cupos" RENAME COLUMN "asientos_contratados_antes" TO "contracted_seats_before";
ALTER TABLE "historial_cupos" RENAME COLUMN "asientos_contratados_despues" TO "contracted_seats_after";
ALTER TABLE "historial_cupos" RENAME COLUMN "asientos_usados_antes" TO "used_seats_before";
ALTER TABLE "historial_cupos" RENAME COLUMN "asientos_usados_despues" TO "used_seats_after";
ALTER TABLE "historial_cupos" RENAME COLUMN "empleados_suspendidos" TO "suspended_employees";
ALTER TABLE "historial_cupos" RENAME TO "seat_history";
