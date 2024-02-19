import { UTCDateMini } from "@date-fns/utc";
import { parse as parseDate, subMinutes } from "date-fns";
import { isDate } from "lodash-es";
import z from "zod";

import { formatDate } from "~/utils/date";

const basePersonalInformation = z.object({
  name: z.string(),
  label: z.string(),
  size: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
  pinned: z.boolean().optional(),
});

const personalInformationText = basePersonalInformation.extend({
  type: z.literal("text"),
});

const personalInformationNumber = basePersonalInformation.extend({
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
});

const personalInformationDate = basePersonalInformation.extend({
  type: z.literal("date"),
  min: z.date(),
  max: z.date(),
});

export const contestSchema = z.object({
  id: z.string(),
  name: z.string(),
  problemIds: z.coerce.string().array(),

  contestWindowStart: z.date().optional(),
  contestWindowEnd: z.date().optional(),
  duration: z.coerce.number().positive().optional(),

  statementVersion: z.number(),

  personalInformation: z.array(
    z.discriminatedUnion("type", [
      personalInformationText,
      personalInformationNumber,
      personalInformationDate,
    ]),
  ),
  hasVariants: z.boolean(),
  hasOnline: z.boolean(),
  hasPdf: z.boolean(),
  allowRestart: z.boolean(),
  allowImport: z.boolean(),

  instructions: z.string().optional(),
});

export type Contest = z.infer<typeof contestSchema>;

export function parsePersonalInformation(
  value: string | undefined,
  schema?: Contest["personalInformation"][number],
  options?: { dateFormat?: string },
): [string | number | Date | undefined, string | undefined] {
  if (value === undefined || !schema) {
    return [value, undefined];
  }
  const label = `"${schema.label}"`.toLowerCase();
  switch (schema.type) {
    case "text": {
      value = value
        .replaceAll(/\s+/g, " ")
        .replaceAll(/[`´‘’]/g, "'")
        .trim();
      if (/[^-'\s\p{Alpha}]/u.test(value)) {
        const helpUtf8 = /[^\p{ASCII}]/u.test(value) ? " e che la codifica sia UTF-8" : "";
        return [
          undefined,
          `Il campo ${label} contiene caratteri non validi. Assicurati che non ci siano simboli${helpUtf8}.`,
        ];
      }
      if (value.length > 256) {
        return [undefined, `Il campo ${label} non può essere più lungo di 256 caratteri.`];
      }
      return [value, undefined];
    }
    case "number": {
      if (!/^-?\d+$/.test(value)) {
        return [undefined, `Il campo ${label} deve essere un numero intero.`];
      }
      const num = Number(value);
      if (schema?.min !== undefined && num < schema.min) {
        return [undefined, `Il campo ${label} deve essere maggiore o uguale a ${schema.min}.`];
      }
      if (schema?.max !== undefined && num > schema.max) {
        return [undefined, `Il campo ${label} deve essere minore o uguale a ${schema.max}.`];
      }
      return [num, undefined];
    }
    case "date": {
      let date: Date;
      if (value === "") {
        return [undefined, `Il campo ${label} è obbligatorio.`];
      }
      if (isDate(value)) {
        date = value;
      } else if (options?.dateFormat) {
        date = parseDate(value, options.dateFormat, new Date());
      } else {
        date = new UTCDateMini(value);
      }
      date = subMinutes(date, date.getTimezoneOffset());
      if (date < schema?.min) {
        return [
          undefined,
          `Il campo ${label} deve contenere una data successiva al ${formatDate(schema.min)}.`,
        ];
      }
      if (date > schema?.max) {
        return [
          undefined,
          `Il campo ${label} deve contenere una data precedente al ${formatDate(schema.max)}.`,
        ];
      }
      return [date, undefined];
    }
  }
}
