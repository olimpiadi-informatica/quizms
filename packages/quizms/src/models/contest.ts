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

  // Domini da cui è possibile svolgere la gara
  allowedOrigins: z.string().array().optional(),

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
        const helpUtf8 = /[^\p{ASCII}]/u.test(normalized) ? " e che la codifica sia UTF-8" : "";
        throw new Error(
          `Il campo ${label} contiene caratteri non validi. Assicurati che non ci siano numeri o simboli${helpUtf8}.`,
        );
      }
      if (value.length > 256) {
        throw new Error(`Il campo ${label} non può essere più lungo di 256 caratteri.`);
      }
      return normalized;
    }
    case "number": {
      const num = Number(value);
      if (!Number.isInteger(num)) {
        throw new Error(`Il campo ${label} deve essere un numero intero.`);
      }
      if (schema?.min !== undefined && num < schema.min) {
        throw new Error(`Il campo ${label} deve essere maggiore o uguale a ${schema.min}.`);
      }
      if (schema?.max !== undefined && num > schema.max) {
        throw new Error(`Il campo ${label} deve essere minore o uguale a ${schema.max}.`);
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
          `Il campo ${label} deve contenere una data successiva al ${intlFormat(schema.min, { dateStyle: "short" })}.`,
        );
      }
      if (date > schema?.max) {
        throw new Error(
          `Il campo ${label} deve contenere una data precedente al ${intlFormat(schema.max, { dateStyle: "short" })}.`,
        );
      }
      return date;
    }
  }
}

export function formatUserData(
  student: Student | undefined,
  schema: Contest["userData"][number],
): string {
  const value = student?.userData?.[schema?.name];
  if (value === undefined) return "";
  if (schema.type === "date") {
    return intlFormat(value as Date, { dateStyle: "short" });
  }
  return value.toString();
}
