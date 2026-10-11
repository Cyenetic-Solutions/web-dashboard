import type { Config } from "tailwindcss";

/** Cyenetic brand, semantic theme and severity tokens shared by all frontend features. */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "cye-black": "#0A0A0A",
        "cye-white": "#FFFFFF",
        "cye-orange": "#FF5C00",
        canvas: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        ink: "var(--text)",
        muted: "var(--text-muted)",
        subtle: "var(--text-subtle)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        "accent-soft": "var(--accent-soft)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        "cvss-critical": "#DC2626",
        "cvss-high": "#FF5C00",
        "cvss-medium": "#EAB308",
        "cvss-low": "#3B82F6",
        "cvss-info": "#737373",
      },
      fontFamily: {
        sans: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Anton", "Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
