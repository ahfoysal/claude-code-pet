import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: "#0b0d12",
        cream: "#f5efe6",
        ember: "#e8815a",
        leaf: "#4cc38a",
        amber: "#f5a524",
        sky: "#6e9bf5",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        drift: {
          "0%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(20px,-16px)" },
          "100%": { transform: "translate(0,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        floaty: "floaty 3.4s ease-in-out infinite",
        drift: "drift 12s ease-in-out infinite",
        shimmer: "shimmer 8s ease infinite",
        blink: "blink 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
