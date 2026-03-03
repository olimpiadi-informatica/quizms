import { type Contest, type Student, type Variant, type Venue, validateAnswer } from "~/models";

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
    if (!student.variantId) return "Variante mancante";
    if (!(student.variantId in variants)) return `La variante ${student.variantId} non è valida`;
  }
  const variant = variants[student.variantId!] ?? Object.values(variants)[0];

  const answers = student.answers ?? {};
  for (const id of Object.keys(variant.schema)) {
    const err = validateAnswer(answers[id], variant.schema[id]);
    if (err) {
      return err[0];
    }
  }
}

export function canViewScore(contest: Contest, venue: Venue) {
  if (contest.scoreVisibility === "never") {
    return false;
  }
  if (contest.scoreVisibility === "always") {
    return true;
  }
  if (contest.scoreVisibility === "finalized") {
    return venue.finalized;
  }
  return false;
}
