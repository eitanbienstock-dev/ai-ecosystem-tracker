import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0F11",
        panel: "#16181C",
        panelhi: "#1D2024",
        line: "#2A2D33",
        muted: "#8B9099",
        signal: "#E8B339",
        rise: "#4FA868",
        fall: "#C2554F",
      },
      fontFamily: {
        display: ['"Helvetica Neue"', "Arial", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
