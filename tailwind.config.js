/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html", "./client/**/*.{jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        xs: "1rem", // 16px
        sm: "1.25rem", // 20px
        base: "1.5rem", // 24px
        lg: "2rem", // 32px
        xl: "2.5rem", // 40px
        "2xl": "3rem", // 48px
        "3xl": "4rem", // 64px
        "4xl": "5rem", // 80px
        "5xl": "6rem", // 96px
        "6xl": "8rem", // 128px
        "7xl": "10rem", // 160px
        "8xl": "12rem", // 192px
        "9xl": "14rem", // 224px
      },
    },
  },
  plugins: [],
};
