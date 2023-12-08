import { readFile } from "node:fs/promises";

export default async function readVariantIds(variantJson: string, secret: string) {
  const variantIds: string[] = JSON.parse(await readFile(variantJson, "utf-8"));
  console.log(variantIds);
  const variantIdsWithSecret = variantIds.map((variantId) => `${secret}${variantId}`);
  return variantIdsWithSecret;
}
