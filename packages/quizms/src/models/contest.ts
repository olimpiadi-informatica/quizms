import { intlFormat, parse as parseDate, subMinutes } from "date-fns";
import { deburr } from "lodash-es";
import z from "zod";

import type { Student } from "~/models/student";

const baseUserData = z.strictObject({
  name: z.string(),
  label: z.string(),
  size: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
  pinned: z.boolean().optional(),
  excludeFromUniqueCheck: z.boolean().optional(),
});

const userDataText = baseUserData.extend({
  type: z.literal("text"),
  pattern: z.string().default("[\\-'\\s\\p{Alpha}]+"),
  patternMismatch: z.string().default("Il campo non può contenere numeri o simboli."),
  patternHelp: z.string().default("Assicurati che non ci siano numeri o simboli"),
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

const userData = z
  .array(z.discriminatedUnion("type", [userDataText, userDataNumber, userDataDate]))
  .refine((data) => data.some((d) => d.name === "surname"), {
    error: "Must contain a surname field",
  })
  .refine((data) => data.some((d) => d.name === "name"), { error: "Must contain a name field" });

const baseContestSchema = z.strictObject({
  // Identificativo univoco della gara
  id: z.string(),
  // Nome corto della gara
  name: z.string(),
  // Nome lungo della gara
  longName: z.string(),
  // ID dei problemi della gara
  problemIds: z.coerce.string().array(),

  // Informazioni personali richieste agli studenti
  userData,

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

  // Possibilità per gli insegnanti di vedere il punteggio degli studenti
  scoreVisibility: z.enum(["never", "always", "finalized"]),
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
  switch (schema.type) {
    case "text": {
      return value
        .replaceAll(/\s+/g, " ")
        .replaceAll(/[`´‘’]/g, "'")
        .trim();
    }
    case "number": {
      return Number(value);
    }
    case "date": {
      const date = options?.dateFormat
        ? parseDate(value, options.dateFormat, new Date())
        : new Date(value);
      return subMinutes(date, date.getTimezoneOffset());
    }
  }
}

export function validateUserData(
  rawValue: string | number | Date | undefined,
  schema: Contest["userData"][number],
): [string] | null {
  if (rawValue == null) return null;
  const label = `"${schema.label}"`.toLowerCase();
  switch (schema.type) {
    case "text": {
      const value = rawValue as string;
      const re = new RegExp(schema.pattern);
      if (!re.test(value)) {
        const helpUtf8 = /[^\p{ASCII}]/u.test(value) ? " e che la codifica sia UTF-8" : "";
        return [
          `Il campo ${label} contiene caratteri non validi. ${schema.patternHelp}${helpUtf8}.`,
        ];
      }
      if (value.length > 256) {
        return [`Il campo ${label} non può essere più lungo di 256 caratteri.`];
      }
      return null;
    }
    case "number": {
      const value = rawValue as number;
      if (!Number.isInteger(value)) {
        return [`Il campo ${label} deve essere un numero intero.`];
      }
      if (schema?.min !== undefined && value < schema.min) {
        return [`Il campo ${label} deve essere maggiore o uguale a ${schema.min}.`];
      }
      if (schema?.max !== undefined && value > schema.max) {
        return [`Il campo ${label} deve essere minore o uguale a ${schema.max}.`];
      }
      return null;
    }
    case "date": {
      const value = rawValue as Date;
      if (schema.min && value < schema.min) {
        return [
          `Il campo ${label} deve contenere una data successiva al ${formatDate(schema.min)}.`,
        ];
      }
      if (schema.max && value > schema.max) {
        return [
          `Il campo ${label} deve contenere una data precedente al ${formatDate(schema.max)}.`,
        ];
      }
      return null;
    }
  }
}

export function formatUserData(
  student: { userData?: Student["userData"] } | undefined,
  schema: Contest["userData"][number],
): string {
  const value = student?.userData?.[schema?.name];
  if (value == null) return "";
  if (schema.type === "date") return formatDate(value as Date);
  return value.toString();
}

function formatDate(value: Date) {
  return intlFormat(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getNormalizedUserData(
  contest: Contest,
  student: { userData?: Student["userData"]; token?: string },
) {
  const fields = contest.userData
    .filter((filer) => !filer.excludeFromUniqueCheck)
    .map((field) => formatUserData(student, field));

  return deburr(fields.join("\n").toLowerCase()).replaceAll(/[^\w\n]/g, "");
}
