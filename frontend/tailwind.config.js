/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'selector',   // Tailwind v4: respond to .dark class on <html>
  theme: {
    extend: {},
  },
  plugins: [],
}
