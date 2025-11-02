import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          "zod",
          "@ai-sdk/anthropic",
          "@ai-sdk/openai",
          "@ai-sdk/provider-utils",
          "ai",
        ],
      }),
    ],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          topbar: resolve(__dirname, "src/preload/topbar.ts"),
          sidebar: resolve(__dirname, "src/preload/sidebar.ts"),
          panel: resolve(__dirname, "src/preload/panel.ts"),
          tab: resolve(__dirname, "src/preload/tab.ts"),
        },
      },
    },
  },
  renderer: {
    root: "src/renderer",
    build: {
      rollupOptions: {
        input: {
          topbar: resolve(__dirname, "src/renderer/topbar/index.html"),
          sidebar: resolve(__dirname, "src/renderer/sidebar/index.html"),
          panel: resolve(__dirname, "src/renderer/panel/index.html"),
        },
      },
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@preload": resolve("src/preload"),
      },
    },
    plugins: [react(), tailwindcss()],
    server: {
      fs: {
        allow: [".."],
      },
    },
  },
});
