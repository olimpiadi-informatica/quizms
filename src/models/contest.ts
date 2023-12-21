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

  startingWindowStart: z.date().optional(),
  startingWindowEnd: z.date().optional(),
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
  pdfPerSchool: z.number().optional(),

  // instructions: z.string().optional(),
});

export type Contest = z.infer<typeof contestSchema>;

export function parsePersonalInformation(
  value: any,
  schema?: Contest["personalInformation"][number],
  options?: { dateFormat?: string },
) {
  if (!schema) return value;
  switch (schema.type) {
    case "text":
      return value;
    case "number": {
      const unbounded = Number(value);
      if ((schema?.min ?? -Infinity) <= unbounded && unbounded <= (schema?.max ?? Infinity)) {
        return unbounded;
      }
      return;
    }
    case "date": {
      if (!value) return;
      let date: Date | string = value;
      if (options?.dateFormat) {
        date = parseDate(value, options.dateFormat, 0);
        date = subMinutes(date, date.getTimezoneOffset());
      }
      date = new UTCDateMini(date);
      if (schema.min <= date && date <= schema.max) return date;
      return;
    }
  }
}
