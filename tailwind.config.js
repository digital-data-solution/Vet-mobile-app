/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#222',
        accent: '#007AFF',
        muted: '#f5f5f5',
        border: '#ddd',
      },
    },
  },
  plugins: [],
};
