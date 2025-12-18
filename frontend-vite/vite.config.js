import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { copyFileSync, mkdirSync, existsSync, readdirSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-extension-files",
      closeBundle() {
        // Create icons directory if it doesn't exist
        if (!existsSync("dist/icons")) {
          mkdirSync("dist/icons", { recursive: true });
        }

        // Copy manifest from src or public
        if (existsSync("src/manifest.json")) {
          copyFileSync("src/manifest.json", "dist/manifest.json");
        } else if (existsSync("public/manifest.json")) {
          copyFileSync("public/manifest.json", "dist/manifest.json");
        }

        // Copy icons from src/icons to dist/icons
        if (existsSync("src/icons")) {
          const iconFiles = readdirSync("src/icons");
          iconFiles.forEach((file) => {
            copyFileSync(`src/icons/${file}`, `dist/icons/${file}`);
          });
        }

        // Copy options.html from src to dist
        if (existsSync("src/options.html")) {
          copyFileSync("src/options.html", "dist/options.html");
        }

        // Copy any background or content scripts
        const scriptFiles = ["background.js", "content.js"];
        scriptFiles.forEach((file) => {
          if (existsSync(`src/${file}`)) {
            copyFileSync(`src/${file}`, `dist/${file}`);
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        options: path.resolve(__dirname, "src/options.js"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
});