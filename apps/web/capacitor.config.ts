import type { CapacitorConfig } from "@capacitor/cli";

const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL;

const config: CapacitorConfig = {
  appId: "co.worldwidewebb.theworkflowengine",
  appName: "The Workflow Engine",
  webDir: "dist",
  backgroundColor: "#000000",
  ...(devServerUrl && {
    server: {
      url: devServerUrl,
      cleartext: true,
    },
  }),
};

export default config;
