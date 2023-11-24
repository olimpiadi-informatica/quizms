import { ZodType } from "zod";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod-validation-error/dist/types/ValidationError";

export default function validate<T>(schema: ZodType<T>, data: any): T {
  try {
    return schema.parse(data);
  } catch (err) {
    const validationError = fromZodError(err as ZodError);
    console.error(validationError.toString());
    throw validationError;
  }
}
