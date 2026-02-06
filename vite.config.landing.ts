import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Vite config for building ONLY the landing page
// Usage: npx vite build --config vite.config.landing.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-landing",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "landing.html"),
      },
    },
  },
});
