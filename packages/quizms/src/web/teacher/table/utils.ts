import { msg } from "@lingui/core/macro";
import type { _t } from "@lingui/react/macro";

import { type Contest, isValidAnswer, type Student, type Variant } from "~/models";

export const deleteConfirmStorageKey = "delete-confirm";

export function isStudentIncomplete(
  student: Student,
  contest: Contest,
  variants: Record<string, Variant>,
  t: typeof _t,
) {
  if (student.absent || student.disabled) return;

  for (const field of contest.userData) {
    if (!student.userData?.[field.name]) {
      return t(msg`${field.label} missing`);
    }
  }

  if (contest.hasVariants) {
    if (!student.variant) return t(msg`Missing variant`);
    if (!(student.variant in variants)) return t(msg`The variant ${student.variant} is not valid`);
  }
  const variant = variants[student.variant!] ?? Object.values(variants)[0];

  const answers = student.answers ?? {};
  for (const id of Object.keys(variant.schema)) {
    if (!(id in answers)) {
      return t`Missing question ${id}`;
    }
    try {
      isValidAnswer(answers[id], variant.schema[id], t);
    } catch (err) {
      return (err as Error).message;
    }
  }
}
