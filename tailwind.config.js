const plugin = require("tailwindcss/plugin");

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
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    plugin(function ({ addUtilities, addVariant }) {
      addUtilities({
        "._block": {
          display: "block",
        },
      });
      addVariant("screen", "@media screen");
    }),
  ],
};
