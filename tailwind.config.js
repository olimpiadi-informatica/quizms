const plugin = require("tailwindcss/plugin");
const daisyThemes = require("daisyui/src/theming/themes");

/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "450px",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui"),
    plugin(function({ addVariant }) {
      addVariant("screen", "@media screen");
    }),
  ],
};
