import { msg } from "@lingui/core/macro";
import { intlFormat, parse as parseDate, subMinutes } from "date-fns";
import { deburr } from "lodash-es";
import z from "zod";

import { i18n as globalI18n, type I18n } from "~/i18n";
import {
  completeLocalizedString,
  type LocalizedString,
  localize,
  localizedStringIssues,
  localizedStringSchema,
} from "~/models/localized";
import type { Student } from "~/models/student";
import { languageCodeRegex } from "~/utils/languages";

const baseUserData = z.strictObject({
  name: z.string(),
  // Translatable: a text or a table with the text in each language
  label: localizedStringSchema,
  size: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
  pinned: z.boolean().optional(),
  excludeFromUniqueCheck: z.boolean().optional(),
});

const userDataText = baseUserData.extend({
  type: z.literal("text"),
  pattern: z.string().default("[\\-'\\s\\p{Alpha}]+"),
  patternMismatch: z.string().default("Il campo non può contenere numeri o simboli."),
  // Translatable; without it, a default message in the UI language is shown
  patternHelp: localizedStringSchema.optional(),
  title: z.boolean().default(false),
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

const matchingRules = z.array(
  z
    .strictObject({
      ordered: z.boolean().default(false),
      required: z.number().optional(),
      fields: z.string().array(),
    })
    .transform((data) => {
      return {
        ...data,
        required: data.required ?? data.fields.length,
      };
    }),
);

/**
 * - `immediate`: the student's test ends as soon as they submit.
 * - `teacher_approval`: the student requests the submission, the teacher approves or rejects it.
 */
export const contestTerminationModeSchema = z.enum(["immediate", "teacher_approval"]);
export type ContestTerminationMode = z.infer<typeof contestTerminationModeSchema>;

const onlineContestSettings = z.strictObject({
  // Finestra di tempo durante la quale è possibile far partire la gara
  contestWindow: z.strictObject({
    start: z.date(),
    end: z.date(),
  }),
  // Durata della gara in minuti
  duration: z.coerce.number().positive(),
  // Se la gara può essere svolta su più turni
  allowRestart: z.boolean(),
  // Come termina la prova dello studente (se assente, "immediate")
  terminationMode: contestTerminationModeSchema.optional(),
});

export const scoreVisibilitySchema = z.enum(["never", "always", "finalized"]);
export type ScoreVisibility = z.infer<typeof scoreVisibilitySchema>;

export const contestSchema = z
  .strictObject({
    // Identificativo univoco della gara
    id: z.string(),
    // Nome corto della gara (traducibile)
    name: localizedStringSchema,
    // Nome lungo della gara (traducibile)
    longName: localizedStringSchema,
    // ID dei problemi della gara
    problemIds: z.coerce.string().array(),

    // Informazioni personali richieste agli studenti
    userData,
    matchingRules,

    // Se i testi della gara hanno più varianti
    hasVariants: z.boolean(),
    // Se la gara può essere svolta online, impostazioni della gara online
    onlineSettings: onlineContestSettings.nullable().default(null),
    // Se la gara può essere svolta in modalità cartacea
    hasOffline: z.boolean(),

    // Se permette all'insegnante di aggiungere o importare studenti
    allowStudentImport: z.boolean().default(true),
    // Se permette all'insegnante di modificare i dati personali degli studenti
    allowStudentEdit: z.boolean().default(true),
    // Se permette all'insegnante di modificare le risposte degli studenti
    allowAnswerEdit: z.boolean().default(true),
    // Se permette all'insegnante di eliminare gli studenti
    allowStudentDelete: z.boolean().default(true),

    // Testo delle istruzioni per la gara da mostrare agli insegnanti
    instructions: localizedStringSchema.optional(),

    // Possibilità per gli insegnanti di vedere il punteggio degli studenti
    scoreVisibility: scoreVisibilitySchema,

    // Lingue dei testi della gara, la prima è quella predefinita
    languages: z.string().regex(languageCodeRegex).array().nonempty().default(["it"]),
  })
  .superRefine((data, ctx) => {
    // Checks that each field in the matchin rules corresponds to a real item
    data.matchingRules.forEach((rule, ruleIndex) => {
      rule.fields.forEach((field, fieldIndex) => {
        if (!data.userData.some((row) => row.name === field)) {
          ctx.addIssue({
            code: "custom",
            message: `Value '${field}' is not in userData`,
            path: ["matchingRules", ruleIndex, fieldIndex],
          });
        }
      });
    });

    // Translated texts must be in the languages of the contest
    for (const [path, value] of localizedFields(data)) {
      for (const message of localizedStringIssues(value, data.languages)) {
        ctx.addIssue({ code: "custom", message, path });
      }
    }
  })
  .transform((data) => ({
    ...data,
    name: completeLocalizedString(data.name, data.languages),
    longName: completeLocalizedString(data.longName, data.languages),
    ...(data.instructions !== undefined && {
      instructions: completeLocalizedString(data.instructions, data.languages),
    }),
    userData: data.userData.map((field) => ({
      ...field,
      label: completeLocalizedString(field.label, data.languages),
      // Only when set: Firestore rejects `undefined` values.
      ...(field.type === "text" &&
        field.patternHelp !== undefined && {
          patternHelp: completeLocalizedString(field.patternHelp, data.languages),
        }),
    })),
  }));

/** The translatable texts of a contest, with their path in the configuration. */
function localizedFields(data: {
  name: LocalizedString;
  longName: LocalizedString;
  instructions?: LocalizedString;
  userData: { label: LocalizedString; patternHelp?: LocalizedString }[];
}): [(string | number)[], LocalizedString | undefined][] {
  return [
    [["name"], data.name],
    [["longName"], data.longName],
    [["instructions"], data.instructions],
    ...data.userData.flatMap((field, i): [(string | number)[], LocalizedString | undefined][] => [
      [["userData", i, "label"], field.label],
      [["userData", i, "patternHelp"], field.patternHelp],
    ]),
  ];
}

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

/** Default `pattern_help` stored by older versions. */
const legacyPatternHelp = "Assicurati che non ci siano numeri o simboli";

/**
 * Validates a personal data field. The messages are in the UI language, with the texts of the
 * configuration in `language` (see `localize`).
 */
export function validateUserData(
  rawValue: string | number | Date | undefined,
  schema: Contest["userData"][number],
  language?: string,
  /** Instance for the messages; by default the one of the page (see `i18n`) */
  i18n: I18n = globalI18n,
): [string] | null {
  if (rawValue == null) return null;
  const label = `"${localize(schema.label, language)}"`.toLowerCase();
  switch (schema.type) {
    case "text": {
      const value = rawValue as string;
      // Anchored like the HTML `pattern` attribute, which must match the whole value.
      const re = new RegExp(`^(?:${schema.pattern})$`, "u");
      if (!re.test(value)) {
        const custom = localize(schema.patternHelp, language);
        // Contests imported by older versions have the old (Italian) default stored.
        const help =
          custom && custom !== legacyPatternHelp
            ? custom
            : i18n._(msg`Make sure there are no numbers or symbols`);
        if (/[^\p{ASCII}]/u.test(value)) {
          return [
            i18n._(
              msg`The field ${label} contains invalid characters. ${help} (check also that the encoding is UTF-8).`,
            ),
          ];
        }
        return [i18n._(msg`The field ${label} contains invalid characters. ${help}.`)];
      }
      if (value.length > 256) {
        return [i18n._(msg`The field ${label} cannot be longer than 256 characters.`)];
      }
      return null;
    }
    case "number": {
      const value = rawValue as number;
      const { min, max } = schema;
      if (!Number.isInteger(value)) {
        return [i18n._(msg`The field ${label} must be an integer.`)];
      }
      if (min !== undefined && value < min) {
        return [i18n._(msg`The field ${label} must be greater than or equal to ${min}.`)];
      }
      if (max !== undefined && value > max) {
        return [i18n._(msg`The field ${label} must be less than or equal to ${max}.`)];
      }
      return null;
    }
    case "date": {
      const value = rawValue as Date;
      if (schema.min && value < schema.min) {
        const date = formatDate(schema.min);
        return [i18n._(msg`The field ${label} must contain a date after ${date}.`)];
      }
      if (schema.max && value > schema.max) {
        const date = formatDate(schema.max);
        return [i18n._(msg`The field ${label} must contain a date before ${date}.`)];
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
    .filter((field) => !field.excludeFromUniqueCheck)
    .map((field) => formatUserData(student, field).toLowerCase())
    .sort();

  return deburr(fields.join("\n")).replaceAll(/[^\w\n]/g, "");
}

export function userDataMatch(
  contest: Contest,
  student1: { userData?: Student["userData"] },
  student2: { userData?: Student["userData"] },
) {
  return contest.matchingRules.every((rule) => {
    const fields = rule.fields.map(
      (fieldName) => contest.userData.find((field) => field.name === fieldName)!,
    );
    let userFields1 = fields.map((field) => formatUserData(student1, field).toLowerCase());
    let userFields2 = fields.map((field) => formatUserData(student2, field).toLowerCase());
    if (!rule.ordered) {
      userFields1 = userFields1.sort();
      userFields2 = userFields2.sort();
    }

    let count = 0;
    for (let i = 0; i < fields.length; i++) {
      if (userFields1[i] === userFields2[i]) {
        count++;
      }
    }
    return count >= rule.required;
  });
}
