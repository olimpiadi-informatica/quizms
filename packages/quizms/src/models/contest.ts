import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { intlFormat, parse as parseDate, subMinutes } from "date-fns";
import z from "zod";

import type { Student } from "~/models/student";

const baseUserData = z.object({
  name: z.string(),
  label: z.string(),
  size: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
  pinned: z.boolean().optional(),
});

const userDataText = baseUserData.extend({
  type: z.literal("text"),
});

const userDataNumber = baseUserData.extend({
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
});

const userDataDate = baseUserData.extend({
  type: z.literal("date"),
  min: z.coerce.date(),
  max: z.coerce.date(),
});

const baseContestSchema = z.object({
  // Identificativo univoco della gara
  id: z.string(),
  // Nome corto della gara
  name: z.string(),
  // Nome lungo della gara
  longName: z.string(),
  // ID dei problemi della gara
  problemIds: z.coerce.string().array(),

  // Informazioni personali richieste agli studenti
  userData: z.array(z.discriminatedUnion("type", [userDataText, userDataNumber, userDataDate])),

  // Se i testi della gara hanno più varianti
  hasVariants: z.boolean(),
  // Se la gara può essere svolta online
  hasOnline: z.boolean(),
  // Se la gara può essere svolta in modalità cartacea
  hasPdf: z.boolean(),

  // Se permette all'insegnante di aggiungere o importare studenti
  allowStudentImport: z.boolean().default(true),
  // Se permette all'insegnante di modificare i dati personali degli studenti
  allowStudentEdit: z.boolean().default(true),
  // Se permette all'insegnante di modificare le risposte degli studenti
  allowAnswerEdit: z.boolean().default(true),
  // Se permette all'insegnante di eliminare gli studenti
  allowStudentDelete: z.boolean().default(true),

  // Testo delle istruzioni per la gara da mostrare agli insegnanti
  instructions: z.string().optional(),
});

const onlineContest = baseContestSchema.extend({
  hasOnline: z.literal(true),

  // Orario da cui è possibile far partire la gara
  contestWindowStart: z.date(),
  // Orario entro cui è possibile far partire la gara
  contestWindowEnd: z.date(),
  // Durata della gara in minuti
  duration: z.coerce.number().positive(),
  // Se la gara può essere svolta su più turni
  allowRestart: z.boolean(),
});

export const contestSchema = z.discriminatedUnion("hasOnline", [
  onlineContest,
  baseContestSchema.extend({ hasOnline: z.literal(false) }),
]);

export type Contest = z.infer<typeof contestSchema>;

export function parseUserData(
  value: string | undefined,
  schema: Contest["userData"][number],
  i18n: I18n,
  options?: { dateFormat?: string },
): string | number | Date | undefined {
  if (!value) return undefined;
  const label = `"${schema.label}"`.toLowerCase();
  switch (schema.type) {
    case "text": {
      const normalized = value
        .replaceAll(/\s+/g, " ")
        .replaceAll(/[`´‘’]/g, "'")
        .trim();
      if (/[^-'\s\p{Alpha}]/u.test(normalized)) {
        const hasUnicode = /[^\p{ASCII}]/u.test(normalized);
        throw new Error(
          hasUnicode
            ? i18n._(
                msg`The field ${label} contains invalid characters. Make sure there are no numbers or symbols.`,
              )
            : i18n._(
                msg`The field ${label} contains invalid characters. Make sure there are no numbers or symbols and that the encoding is UTF-8.`,
              ),
        );
      }
      if (value.length > 256) {
        throw new Error(i18n._(msg`The {label} field cannot be longer than 256 characters.`));
      }
      return normalized;
    }
    case "number": {
      const num = Number(value);
      if (!Number.isInteger(num)) {
        throw new Error(i18n._(msg`The {label} field must be an integer.`));
      }
      if (schema?.min !== undefined && num < schema.min) {
        throw new Error(
          i18n._(msg`The field ${label} must be greater than or equal to ${schema.min}.`),
        );
      }
      if (schema?.max !== undefined && num > schema.max) {
        throw new Error(
          i18n._(msg`The field ${label} must be less than or equal to ${schema.max}.`),
        );
      }
      return num;
    }
    case "date": {
      let date = options?.dateFormat
        ? parseDate(value, options.dateFormat, new Date())
        : new Date(value);
      date = subMinutes(date, date.getTimezoneOffset());
      if (date < schema?.min) {
        throw new Error(
          i18n._(
            msg`The field ${label} must contain a date after ${intlFormat(schema.min, { dateStyle: "short" }, { locale: i18n.locale })}.`,
          ),
        );
      }
      if (date > schema?.max) {
        throw new Error(
          i18n._(
            msg`The field ${label} must contain a date prior to ${intlFormat(schema.max, { dateStyle: "short" }, { locale: i18n.locale })}.`,
          ),
        );
      }
      return date;
    }
  }
}

export function formatUserData(
  student: Student | undefined,
  schema: Contest["userData"][number],
  locale: string,
): string {
  const value = student?.userData?.[schema?.name];
  if (value === undefined) return "";
  if (schema.type === "date") {
    return intlFormat(value as Date, { dateStyle: "short" }, { locale });
  }
  return value.toString();
}
