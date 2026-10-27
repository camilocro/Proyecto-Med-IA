import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B4F72",
          600: "#2E86C1",
          100: "#D6EAF8",
        },
        accent: "#2E86C1",
        light: "#D6EAF8",
        background: "#F8FBFF",
        urgency: {
          emergencia: "#922B21",
          alto: "#C0392B",
          medio: "#E67E22",
          bajo: "#1A7A40",
        },
      },
    },
  },
  plugins: [],
};

export default config;
