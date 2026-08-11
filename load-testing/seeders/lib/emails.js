// Fuente unica de verdad de los correos sembrados.
//
// Se usa yopmail.com (bandeja desechable) para poder abrir los correos que el
// portal envie durante las pruebas. Pero `@yopmail.com` por si solo NO puede
// ser el criterio de borrado: si alguna vez existe un usuario real con yopmail,
// el teardown se lo llevaria por delante. Por eso cada correo sembrado lleva
// ademas el marcador estructural `lt-empresa-NN` o `lt-import`, y el teardown
// borra por los patrones completos de abajo, nunca por el dominio suelto.
//
// Formatos:
//   RH        rh-lt-empresa-01@yopmail.com
//   Empleado  emp001-lt-empresa-01@yopmail.com
//   Import    imp-lt-import-1754130000000-7@yopmail.com

const DOMAIN = "yopmail.com"

const rhEmail = (slug) => `rh-${slug}@${DOMAIN}`

const employeeEmail = (slug, n) => `emp${String(n).padStart(3, "0")}-${slug}@${DOMAIN}`

const importEmail = (runId, n) => `imp-lt-import-${runId}-${n}@${DOMAIN}`

// Patrones exactos para el teardown. Cada uno exige el marcador Y el dominio,
// asi que no pueden colisionar con un correo real.
const TEARDOWN_EMAIL_PATTERNS = [
  `rh-lt-empresa-%@${DOMAIN}`,
  `emp%-lt-empresa-%@${DOMAIN}`,
  `imp-lt-import-%@${DOMAIN}`,
]

module.exports = { DOMAIN, rhEmail, employeeEmail, importEmail, TEARDOWN_EMAIL_PATTERNS }
