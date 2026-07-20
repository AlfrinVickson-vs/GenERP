import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        line: "#d8dee5",
        paper: "#f8faf8",
        pine: "#0f3d33",
        copper: "#a65f2b",
        sky: "#2d6f96",
        plum: "#6b4d7e"
      }
    }
  },
  plugins: []
};

export default config;
