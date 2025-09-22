/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        phishnavy: "#07143a",
        phishblue: "#1e40af",
        phishblack: "#000000",
        phishwhite: "#ffffff",
        phishgray: "#6b7280"
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial']
      }
    }
  },
  plugins: []
}
