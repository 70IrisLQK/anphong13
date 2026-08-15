import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "github",
  base: "./",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../github-pages",
    emptyOutDir: true,
  },
});
