import { registerCatalog } from "@olinfo/quizms/i18n";

// UI messages of this package, translated in `locales/<locale>.po`.
registerCatalog((locale) => import(`../locales/${locale}.po`));
