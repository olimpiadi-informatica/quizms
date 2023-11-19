import { binaryConverter } from "./basics";

export type Statement = Uint8Array;
export const statementConverter = binaryConverter;

export type Password = Uint8Array;
export const passwordConverter = binaryConverter;
