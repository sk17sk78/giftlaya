import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Keep Tailwind v4's class-based dark selector out of index.css so VS Code's CSS linter stays quiet.
function injectTailwindClassDark(): Plugin {
  return {
    name: "inject-tailwind-class-dark",
    enforce: "pre",
    transform(code, id) {
      const cleanId = id.split("?")[0].replace(/\\/g, "/");
      if (cleanId.endsWith("/src/index.css")) {
        return code.replace(
          '@import "tailwindcss";',
          '@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));'
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), injectTailwindClassDark(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

