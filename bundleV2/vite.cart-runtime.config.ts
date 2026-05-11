import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    sourcemap: true,
    cssCodeSplit: false,
    outDir: "extensions/bundle-theme-product-custom/assets",
    rollupOptions: {
      input: "extensions/bundle-theme-product-custom/src/cart-runtime/index.tsx",
      output: {
        entryFileNames: "cart-runtime.js",
        assetFileNames: "cart-runtime.[ext]",
      },
    },
  },
  resolve: {
    alias: {
      "@cart-runtime": path.resolve(__dirname, "cart-runtime"),
    },
  },
});
