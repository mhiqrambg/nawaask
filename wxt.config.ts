import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@preact/preset-vite"],
  manifest: {
    name: "NawaAsk",
    short_name: "NawaAsk",
    description: "Your AI, Anywhere on the Web.",
    permissions: ["sidePanel", "storage", "tabs", "activeTab"],
    host_permissions: ["<all_urls>"],
    optional_permissions: ["clipboardWrite"],
    commands: {
      "open-nawaask": {
        suggested_key: {
          default: "Ctrl+Shift+K",
          mac: "Command+Shift+K",
        },
        description: "Open NawaAsk side panel",
      },
    },
    action: {
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
      },
    },
  },
  vite: () => ({
    plugins: [preact(), tailwindcss()],
  }),
});
