/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./main.jsx", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#0f172a",
        primary: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
        },
        secondary: "#f1f5f9",
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#475569",
        },
        border: "#e2e8f0",
        card: "#ffffff",
      },
    },
  },
  plugins: [],
};
