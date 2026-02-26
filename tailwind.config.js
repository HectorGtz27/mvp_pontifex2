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
          50: '#f0f9f4',
          100: '#dcf2e4',
          200: '#bce5cb',
          300: '#8bd1a8',
          400: '#54b57d',
          500: '#31995d',
          600: '#237a49',
          700: '#1d613b',
          800: '#1a4e32',
          900: '#17402a',
        },
      },
    },
  },
  plugins: [],
}
