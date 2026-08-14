import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: "./" so the build works from a subpath (GitHub Pages) as well as a root
// domain, without needing to know which one at build time.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
});
