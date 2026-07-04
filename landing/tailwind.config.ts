import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        term: ["var(--font-term)", "monospace"],
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        night: "#160a2b",
        grape: "#2a1250",
        pink: "#ff2e97",
        coral: "#ff7a3d",
        gold: "#ffd23f",
        cyan: "#2de2e6",
        cream: "#fdf3e3",
        lime: "#8be04a",
      },
      keyframes: {
        hop: {
          "0%": { transform: "translateX(0) translateY(0) scaleX(1)" },
          "10%": { transform: "translateX(4vw) translateY(-22px)" },
          "20%": { transform: "translateX(8vw) translateY(0)" },
          "30%": { transform: "translateX(12vw) translateY(-22px)" },
          "40%": { transform: "translateX(16vw) translateY(0)" },
          "50%": { transform: "translateX(20vw) translateY(-22px)" },
          "60%": { transform: "translateX(24vw) translateY(0)" },
          "70%": { transform: "translateX(28vw) translateY(-22px)" },
          "80%": { transform: "translateX(32vw) translateY(0)" },
          "90%": { transform: "translateX(36vw) translateY(-22px)" },
          "100%": { transform: "translateX(40vw) translateY(0)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseGlow: {
          "0%, 100%": { filter: "drop-shadow(0 0 0 rgba(255,46,151,0))" },
          "50%": { filter: "drop-shadow(0 0 14px rgba(255,46,151,0.7))" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0.15" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        floaty: "floaty 3s ease-in-out infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        blink: "blink 1s steps(1) infinite",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
