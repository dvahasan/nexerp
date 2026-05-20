/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind v4: content paths are auto-detected; dark mode is configured
  // via @custom-variant dark in index.css — no darkMode key needed here.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
