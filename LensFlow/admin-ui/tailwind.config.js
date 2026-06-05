/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shopify: {
          blue: '#005bd3',
          'blue-hover': '#004bb8',
          green: '#28a745',
          red: '#d82c0d',
          bg: '#f6f6f7',
          border: '#e3e3e3',
          text: '#333333',
          'text-secondary': '#666666',
          'text-muted': '#999999',
        },
      },
      borderRadius: {
        shopify: '6px',
      },
      fontFamily: {
        shopify: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'San Francisco', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}