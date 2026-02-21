import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pyeonharu.app",
  appName: "편하루",
  webDir: "out",
  server: {
    url: "https://www.pyeonharu.com",
    cleartext: true,
  },
};

export default config;
