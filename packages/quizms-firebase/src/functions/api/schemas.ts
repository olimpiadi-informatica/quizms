import z from "zod";

/**
 * Id of a Firestore document, safe to interpolate into a document path: it can't contain `/`
 * (which would address a different document) and it follows Firestore's id restrictions.
 */
export const docId = z
  .string()
  .min(1)
  .max(1500)
  .refine((id) => !id.includes("/") && id !== "." && id !== ".." && !/^__.*__$/.test(id), {
    error: "Id non valido",
  });
