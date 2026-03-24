/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0B0F19",
        },
        neon: {
          blue: "#3B82F6",
          purple: "#A855F7",
          red: "#F97373",
        },
      },
      boxShadow: {
        glass: "0 18px 45px rgba(15, 23, 42, 0.85)",
      },
      backdropBlur: {
        glass: "18px",
      },
    },
  },
  plugins: [],
};