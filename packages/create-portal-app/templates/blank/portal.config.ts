import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { portalPlugin } from "@interchained/portal-core/vite";

export default defineConfig({
  plugins: [
    react(),
    portalPlugin(),
  ],
  server: {
    port: 3000,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
