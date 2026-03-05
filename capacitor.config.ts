import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pyeonharu.app",
  appName: "편하루",
  webDir: "out",
  server: {
    url: "https://www.pyeonharu.com",
    cleartext: true,
    allowNavigation: [
      "*.supabase.co",
      "accounts.google.com",
      "*.google.com",
      "kauth.kakao.com",
      "accounts.kakao.com",
      "*.kakao.com",
    ],
  },
};

export default config;
