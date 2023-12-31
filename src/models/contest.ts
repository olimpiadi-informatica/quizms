import { UTCDateMini } from "@date-fns/utc";
import { parse as parseDate, subMinutes } from "date-fns";
import z from "zod";

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

  personalInformation: z.array(
    z.discriminatedUnion("type", [
      personalInformationText,
      personalInformationNumber,
      personalInformationDate,
    ]),
  ),
  hasVariants: z.boolean(),
  allowRestart: z.boolean(),

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
  switch (schema.type) {
    case "text": {
      value = value.trim();
      if (value === "") {
        return [undefined, "Il campo non può essere vuoto."];
      }
      if (value.length > 256) {
        return [undefined, "Il campo non può essere più lungo di 256 caratteri."];
      }
      return [value, undefined];
    }
    case "number": {
      const num = Number(value);
      if (isNaN(num)) {
        return [undefined, "Il valore non è un numero."];
      }
      if (schema?.min !== undefined && num < schema.min) {
        return [undefined, `Il valore deve essere maggiore o uguale a ${schema.min}.`];
      }
      if (schema?.max !== undefined && num > schema.max) {
        return [undefined, `Il valore deve essere minore o uguale a ${schema.max}.`];
      }
      return [num, undefined];
    }
    case "date": {
      let date: Date;
      if (options?.dateFormat) {
        date = parseDate(value, options.dateFormat, 0);
        date = subMinutes(date, date.getTimezoneOffset());
      } else {
        date = new UTCDateMini(value);
      }
      if (date < schema?.min) {
        const formatter = new Intl.DateTimeFormat("it-IT", { dateStyle: "long" });
        return [undefined, `La data deve essere successiva al ${formatter.format(schema.min)}.`];
      }
      if (date > schema?.max) {
        const formatter = new Intl.DateTimeFormat("it-IT", { dateStyle: "long" });
        return [undefined, `La data deve essere precedente al ${formatter.format(schema.max)}.`];
      }
      return [date, undefined];
    }
  }
}
