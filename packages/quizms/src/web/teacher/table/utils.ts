import { msg } from "@lingui/core/macro";

import type { I18n } from "~/i18n";
import {
  type Contest,
  localize,
  type Student,
  type Variant,
  type Venue,
  validateAnswerValue,
} from "~/models";

export const deleteConfirmStorageKey = "delete-confirm";

export function isStudentIncomplete(
  student: Student,
  contest: Contest,
  variants: Record<string, Variant>,
  i18n: I18n,
  /** Language of the texts of the configuration (see `useContentLanguage`) */
  language: string | undefined,
) {
  if (student.absent || student.disabled) return;

  for (const field of contest.userData) {
    if (!student.userData?.[field.name]) {
      const label = localize(field.label, language);
      return i18n._(msg`${label} missing`);
    }
  }

  if (contest.hasVariants) {
    const variantId = student.variantId;
    if (!variantId) return i18n._(msg`Missing variant`);
    if (!(variantId in variants)) return i18n._(msg`Variant ${variantId} is not valid`);
  }
  const variant = variants[student.variantId!] ?? Object.values(variants)[0];

  const answers = student.answers ?? {};
  for (const id of Object.keys(variant.schema)) {
    const err = validateAnswerValue(answers[id]?.value, variant.schema[id], i18n);
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
