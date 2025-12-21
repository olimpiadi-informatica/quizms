import {
  type Contest,
  type Participation,
  type Student,
  type Variant,
  validateAnswer,
} from "~/models";

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
    if (!variant.schema[id].allowEmpty && !(id in answers)) {
      return `Domanda ${id} mancante`;
    }
    const err = validateAnswer(answers[id], variant.schema[id]);
    if (err) {
      return err[0];
    }
  }
}

export function canViewScore(contest: Contest, participation: Participation) {
  if (contest.scoreVisibility === "never") {
    return false;
  }
  if (contest.scoreVisibility === "always") {
    return true;
  }
  if (contest.scoreVisibility === "finalized") {
    return participation.finalized;
  }
  return false;
}
