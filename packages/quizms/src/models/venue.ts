import z from "zod";

export const venueSchema = z.strictObject({
  id: z.string(),
  schoolId: z.string(),
  contestId: z.string(),
  name: z.string(),
  token: z.string().optional(),
  participationWindow: z
    .strictObject({
      start: z.date(),
      end: z.date(),
    })
    .optional(),
  finalized: z.boolean().default(false),
  pdfVariants: z.array(z.coerce.string()),
  disabled: z.boolean().default(false),
});

export type Venue = z.infer<typeof venueSchema>;
export type TimeRange = NonNullable<Venue["participationWindow"]>;
