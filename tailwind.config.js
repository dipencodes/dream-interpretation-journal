/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#F7F3EE",
          surface: "#FFFFFF",
          elevated: "#FBF7F2",
        },
        brand: {
          primary: "#4E6E5D",
          saffron: "#D4A373",
          copper: "#8C5A2B",
        },
        text: {
          primary: "#2E2E2E",
          secondary: "#6B6B6B",
          inverse: "#FFFFFF",
        },
        border: {
          subtle: "#E7DED3",
          default: "#D8CBBE",
        },
        chat: {
          user: "#E6EFE9",
          bot: "#F1E6D8",
        },
        state: {
          success: "#2F7A5A",
          warning: "#B07B2C",
          danger: "#B04A3F",
          info: "#3D6D7A",
        },
      },
    },
  },
  plugins: [],
};
