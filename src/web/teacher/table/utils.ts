import type { Contest, Student, Variant } from "~/models";

export const deleteConfirmStorageKey = "delete-confirm";

export function isStudentIncomplete(
  student: Student,
  contest: Contest,
  variants: Record<string, Variant>,
) {
  if (student.absent || student.disabled) return;

  for (const field of contest.userData) {
    if (!student.userData?.[field.name]) {
      return `${field.label} mancante`;
    }
  }

  if (contest.hasVariants) {
    if (!student.variant) return "Variante mancante";
    if (!(student.variant in variants)) return `La variante ${student.variant} non è valida`;
  }
}
