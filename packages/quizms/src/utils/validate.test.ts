import { describe, expect, it } from "vitest";
import z from "zod";

import { validate } from "~/utils/validate";

describe("validate", () => {
  const schema = z.object({ n: z.coerce.number() });

  it("returns the parsed data", () => {
    expect(validate(schema, { n: "3" })).toEqual({ n: 3 });
  });

  it("throws a readable error for invalid data", () => {
    expect(() => validate(schema, { n: "x" })).toThrow(/^Failed to parse data:\n.*→ at n/s);
  });
});
