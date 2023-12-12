import z, { ParseInput, ParseReturnType, ZodType, ZodTypeDef } from "zod";

export class ZodBytes extends ZodType<Uint8Array> {
  private inner: ZodType<Uint8Array>;

  constructor(def: ZodTypeDef) {
    super(def);
    this.inner = z.instanceof(Uint8Array);
  }

  _parse(input: ParseInput): ParseReturnType<Uint8Array> {
    return this.inner._parse(input);
  }
}

export function zodBytes() {
  return new ZodBytes({});
}
