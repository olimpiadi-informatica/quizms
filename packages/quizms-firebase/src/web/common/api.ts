import { validate } from "@olinfo/quizms/utils";
import z, { type ZodObject, type ZodRawShape } from "zod";

const responseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: z.any() }),
  z.object({ success: z.literal(false), errorCode: z.string(), error: z.string() }),
]);

async function api<Shape extends ZodRawShape>(
  endpoint: `/api/${string}`,
  body: any,
  shape: Shape,
): Promise<z.infer<ZodObject<Shape>>> {
  let json: any;
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    json = await resp.json();
  } catch (err: any) {
    throw new Error("Server non raggiungibile", { cause: err });
  }

  const data = validate(responseSchema, json);
  if (!data.success) {
    throw new Error(data.error);
  }
  return validate(data.data, z.object(shape));
}

export function login(role: string, body: { token: string }) {
  return api(`/api/${role}/login`, body, { token: z.string(), approvalId: z.number().optional() });
}

export function startParticipation(participationId: string, startingTime: Date | null) {
  return api("/api/teacher/participation", { participationId, startingTime }, {});
}

export function finalizeParticipation(participationId: string) {
  return api("/api/teacher/participation/finalize", { participationId }, {});
}
