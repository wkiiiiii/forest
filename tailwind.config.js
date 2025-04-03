/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0070f3',
        secondary: '#ff4081',
        success: '#00c853',
        warning: '#ffab00',
        danger: '#f44336',
        background: '#f5f5f5',
      },
    },
  },
  plugins: [],
} 