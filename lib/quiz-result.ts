export const QUIZ_RESULT_VARIANT: Record<string, "green" | "amber" | "red" | "slate"> = {
  pass: "green",
  fail: "red",
  pending: "amber",
}

export const QUIZ_RESULT_LABEL: Record<string, string> = {
  pass: "Aprobado",
  fail: "No aprobado",
  pending: "Pendiente de revisión",
}
