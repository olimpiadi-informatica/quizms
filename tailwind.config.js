const plugin = require("tailwindcss/plugin");
const daisyThemes = require("daisyui/src/theming/themes");
const daisyFunctions = require("daisyui/src/theming/functions");

/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      height: {
        "1/2-screen": ["50vh", "50dvh"],
        "3/4-screen": ["75vh", "75dvh"],
        screen: ["100vh", "100dvh"],
      },
      screens: {
        xs: "450px",
      },
    },
  },
  daisyui: {
    themes: ["cupcake", "dark"],
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
