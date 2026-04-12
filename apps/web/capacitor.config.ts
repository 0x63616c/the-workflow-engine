import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_DEV_SERVER_URL || "http://homelab";

const config: CapacitorConfig = {
  appId: "co.worldwidewebb.theworkflowengine",
  appName: "The Workflow Engine",
  webDir: "dist",
  backgroundColor: "#000000",
  server: {
    url: serverUrl,
    cleartext: true,
  },
};

export default config;
