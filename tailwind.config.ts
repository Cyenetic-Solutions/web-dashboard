import type { Config } from "tailwindcss";

/** Cyenetic brand and severity tokens shared by all frontend features. */
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
        "cvss-critical": "#FF5C00",
        "cvss-high": "#E65100",
        "cvss-medium": "#F57C00",
        "cvss-low": "#757575",
        "cvss-info": "#424242",
      },
      fontFamily: {
        sans: ["Space Grotesk", "sans-serif"],
        display: ["Anton", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
