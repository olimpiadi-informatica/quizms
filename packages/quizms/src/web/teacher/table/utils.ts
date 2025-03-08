import { type Contest, type Student, type Variant, isValidAnswer } from "~/models";

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
  const variant = variants[student.variant!] ?? Object.values(variants)[0];

  const answers = student.answers ?? {};
  for (const id of Object.keys(variant.schema)) {
    if (!(id in answers)) {
      return `Domanda ${id} mancante`;
    }
    try {
      isValidAnswer(answers[id], variant.schema[id]);
    } catch (err) {
      return (err as Error).message;
    }
  }
}
