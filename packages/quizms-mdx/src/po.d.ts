// Message catalogs, compiled to JavaScript by `@lingui/vite-plugin`.
declare module "*.po" {
  import type { Messages } from "@lingui/core";

  export const messages: Messages;
}

// Blockly's messages, compiled by `scripts/blockly-po-plugin.mjs`.
declare module "*.po?blockly" {
  const messages: Record<string, string>;
  export default messages;
}
