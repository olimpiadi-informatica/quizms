import type { ZodType } from "zod";
import { type FromZodErrorOptions, fromZodError } from "zod-validation-error";

export default function validate<In, Out>(
  schema: ZodType<Out, any, In>,
  data: In,
  options?: FromZodErrorOptions,
): Out {
  const ret = schema.safeParse(data);
  if (!ret.success) throw fromZodError(ret.error, options);
  return ret.data;
}
