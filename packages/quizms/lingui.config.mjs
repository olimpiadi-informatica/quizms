/** @type {import('@lingui/conf').LinguiConfig} */
const config = {
  locales: ["en", "it"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "src/locales/{locale}",
      include: ["src"],
    },
  ],
  format: "po",
  formatOptions: {
    origins: true,
    lineNumbers: false,
  },
  compileNamespace: "es",
};

export default config;
