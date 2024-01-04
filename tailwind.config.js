const plugin = require("tailwindcss/plugin");
const daisyThemes = require("daisyui/src/theming/themes");
const daisyFunctions = require("daisyui/src/theming/functions");

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
  daisyui: {
    themes: [
      {
        light: {
          ...daisyThemes["cupcake"],
          "--rounded-btn": "0.625rem",
        },
      },
      {
        dark: {
          ...daisyThemes["dark"],
          "--rounded-btn": "0.625rem",
        },
      },
    ],
    logs: false,
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui"),
    plugin(({ addBase }) => {
      addBase({
        "@media print": {
          ":root": daisyFunctions.convertColorFormat(daisyThemes["light"]),
        },
      });
    }),
    plugin(({ addVariant }) => {
      addVariant("screen", "@media screen");
    }),
  ],
};
