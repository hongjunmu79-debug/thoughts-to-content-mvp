/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211c",
        paper: "#f4f1e9",
        moss: "#315c47",
        lime: "#d9f99d",
      },
      boxShadow: {
        lift: "0 20px 60px rgba(35, 50, 41, 0.10)",
      },
    },
  },
  plugins: [],
};

