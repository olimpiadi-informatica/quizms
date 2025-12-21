import z from "zod";

export function validate<Out>(schema: z.core.$ZodType<Out>, data: any): Out {
  const ret = z.safeParse(schema, data);
  if (!ret.success) throw Error(`Failed to parse data:\n${z.prettifyError(ret.error)}`);
  return ret.data;
}
