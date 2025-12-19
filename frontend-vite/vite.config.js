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
        console.log("Copying extension files...");

        // Create necessary directories
        const dirs = ["dist/icons", "dist/utils"];
        dirs.forEach(dir => {
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
            console.log(`Created ${dir} directory`);
          }
        });

        // Copy manifest
        if (existsSync("src/manifest.json")) {
          copyFileSync("src/manifest.json", "dist/manifest.json");
          console.log("✓ Copied manifest.json");
        }

        // Copy all icons
        if (existsSync("src/icons")) {
          const iconFiles = readdirSync("src/icons");
          iconFiles.forEach((file) => {
            copyFileSync(`src/icons/${file}`, `dist/icons/${file}`);
            console.log(`✓ Copied icon: ${file}`);
          });
        }

        // Copy options.html
        if (existsSync("src/options.html")) {
          copyFileSync("src/options.html", "dist/options.html");
          console.log("✓ Copied options.html");
        }

        // Copy popup.html if it exists
        if (existsSync("src/popup.html")) {
          copyFileSync("src/popup.html", "dist/popup.html");
          console.log("✓ Copied popup.html");
        }

        // Copy background service worker
        if (existsSync("src/background.js")) {
          copyFileSync("src/background.js", "dist/background.js");
          console.log("✓ Copied background.js");
        }

        // Copy content scripts
        const contentScripts = [
          "content-gmail.js",
          "content-outlook.js", 
          "content-yahoo.js"
        ];
        contentScripts.forEach((script) => {
          if (existsSync(`src/${script}`)) {
            copyFileSync(`src/${script}`, `dist/${script}`);
            console.log(`✓ Copied ${script}`);
          } else {
            console.log(`⚠ Missing: ${script}`);
          }
        });

        // Copy utils directory
        if (existsSync("src/utils")) {
          const utilFiles = readdirSync("src/utils");
          utilFiles.forEach((file) => {
            copyFileSync(`src/utils/${file}`, `dist/utils/${file}`);
            console.log(`✓ Copied utils/${file}`);
          });
        } else {
          console.log("⚠ Missing: src/utils directory");
        }

        console.log("✅ All extension files copied!");
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