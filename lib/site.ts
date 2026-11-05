// Branding and mount point. These are inlined at build time (see next.config.ts and the Dockerfile build args).
export const site = {
  key: "pbl",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "WOD PR Tracker",
  // iOS 27.2 Add to Home Screen ignores apple-touch-icon and draws the first
  // character of this string. Keep it a single symbol.
  homeScreenName: process.env.NEXT_PUBLIC_HOME_SCREEN_NAME ?? "🏋️",
  passkeys: process.env.NEXT_PUBLIC_PASSKEYS !== "off",
};
