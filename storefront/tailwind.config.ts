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
        brand: {
          DEFAULT: "#9b1b45",
          50: "#fdf2f5",
          100: "#fcf2f6",
          200: "#f6bdce",
          300: "#e7799a",
          400: "#d04f76",
          500: "#bd4d70",
          600: "#9b1b45",
          700: "#8f2549",
          800: "#7e1538",
          900: "#5a0f28",
        },
        surface: {
          pink: "#fcf2f6",
          pinkLight: "#fdf2f5",
          pinkBorder: "#f0e8ed",
          gray: "#f8f5f7",
          dark: "#241d29",
          charcoal: "#29232a",
          darkText: "#111827",
          mutedText: "#856e7b",
          subtleText: "#745565",
        },
        badge: {
          greenText: "#26845f",
          greenBg: "#ecf8f1",
          goldText: "#efab18",
          goldBg: "#fff5db",
        }
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-nunito)", "Nunito", "var(--font-jakarta)", "sans-serif"],
      },
      maxWidth: {
        container: "1168px",
        site: "1200px",
      },
      screens: {
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
      boxShadow: {
        header: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        card: "0 2px 8px -2px rgba(155, 27, 69, 0.08)",
        modal: "0 20px 40px -15px rgba(0, 0, 0, 0.2)",
      }
    },
  },
  plugins: [],
};

export default config;
