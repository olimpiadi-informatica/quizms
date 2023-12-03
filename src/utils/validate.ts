import { ZodType } from "zod";
import { fromZodError } from "zod-validation-error";

export default function validate<In, Out>(schema: ZodType<Out, any, In>, data: In): Out {
  const ret = schema.safeParse(data);
  if (ret.success) return ret.data;

  const validationError = fromZodError(ret.error);
  console.error(validationError.toString());
  throw validationError;
}
