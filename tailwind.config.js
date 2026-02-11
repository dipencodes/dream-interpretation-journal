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
          base: "#FFFFFF",
          surface: "#FFFFFF",
          elevated: "#F7F7F7",
        },
        brand: {
          primary: "#F28C28",
          saffron: "#FFD6A8",
          copper: "#D97706",
        },
        text: {
          primary: "#1F1F1F",
          secondary: "#6B6B6B",
          inverse: "#FFFFFF",
        },
        border: {
          subtle: "#EAEAEA",
          default: "#DADADA",
        },
        chat: {
          user: "#FFF1E5",
          bot: "#F3F4F6",
        },
        state: {
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          info: "#3B82F6",
        },
      },
    },
  },
  plugins: [],
};
