import type { NextConfig } from "next";

// Build-time settings (Next fixes basePath during the build). All optional.
//   BASE_PATH   mount point, e.g. /pb (default: the site root)
//   APP_NAME    name shown in the UI and the web manifest
//   HOME_SCREEN_NAME  one symbol drawn on the iOS home screen icon
//   PASSKEYS    "off" hides passkey sign-in
const basePath = process.env.BASE_PATH ?? "";
if (basePath && !/^\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/.test(basePath)) {
  throw new Error(`BASE_PATH must be empty or look like /pb (no trailing slash), got "${basePath}"`);
}

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_NAME: process.env.APP_NAME ?? "WOD PR Tracker",
    NEXT_PUBLIC_HOME_SCREEN_NAME: process.env.HOME_SCREEN_NAME ?? "🏋️",
    NEXT_PUBLIC_PASSKEYS: process.env.PASSKEYS ?? "on",
  },
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
