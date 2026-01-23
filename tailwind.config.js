/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#4ade80', // green-400
        secondary: '#22c55e', // green-500
        background: '#121212', // almost black
        surface: '#1E1E1E', // dark gray
        text: '#E0E0E0',
        textDim: '#A0A0A0',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
}
