import { ZodType } from "zod";
import { fromZodError } from "zod-validation-error";
import { ZodTypeDef } from "zod/lib/types";

export default function validate<In, Out, Def extends ZodTypeDef>(
  schema: ZodType<Out, Def, In>,
  data: In,
): Out {
  const ret = schema.safeParse(data);
  if (ret.success) return ret.data;

  const validationError = fromZodError(ret.error);
  console.error(validationError.toString());
  throw validationError;
}
