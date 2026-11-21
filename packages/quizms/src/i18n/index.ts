import { registerCatalog } from "./catalogs";

export type { I18n, MessageDescriptor } from "@lingui/core";
export { Trans, useLingui } from "@lingui/react";

export * from "./catalogs";
export * from "./locales";

registerCatalog((locale) => import(`../../locales/${locale}.po`));
