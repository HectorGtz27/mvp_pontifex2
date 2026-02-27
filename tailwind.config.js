/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        pontifex: {
          50: '#e6f9ff',
          100: '#c2f1ff',
          200: '#8ae2ff',
          300: '#4fd0ff',
          400: '#16c0ff',
          500: '#00a6f0', // primary Pontifex blue
          600: '#0086c5',
          700: '#00689a',
          800: '#004d73',
          900: '#00324d',
        },
      },
    },
  },
  plugins: [],
}
