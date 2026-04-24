import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 저널리즘 디자인 시스템
        ink: "#1a1612",
        paper: "#f5f0e8",
        cream: "#ede7d7",
        rust: "#b84c2a",
        "rust-light": "#d4633f",
        gold: "#c8963c",
        muted: "#7a6e62",
        rule: "#c4b89a",
        // 기본 색상
        background: "var(--background, #f5f0e8)",
        foreground: "var(--foreground, #1a1612)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Noto Serif KR", "serif"],
        sans: ["var(--font-sans)", "Noto Sans KR", "sans-serif"],
        mono: ["var(--font-mono)", "DM Mono", "monospace"],
      },
      fontSize: {
        "2xs": "10px",
        xs: "11px",
      },
      letterSpacing: {
        widest: "0.35em",
      },
      borderWidth: {
        "3": "3px",
      },
      maxWidth: {
        article: "680px",
        content: "860px",
      },
      lineHeight: {
        relaxed: "1.8",
        loose: "1.9",
      },
    },
  },
  plugins: [],
};
export default config;
