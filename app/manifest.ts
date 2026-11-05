import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.homeScreenName,
    lang: "en",
    dir: "ltr",
    start_url: `${site.basePath}/`,
    scope: `${site.basePath}/`,
    display: "standalone",
    background_color: "#0c0907",
    theme_color: "#0c0907",
    icons: [
      { src: `${site.basePath}/apple-touch-icon.png`, sizes: "180x180", type: "image/png", purpose: "any" },
      { src: `${site.basePath}/apple-touch-icon-240x240.png`, sizes: "240x240", type: "image/png", purpose: "any" },
      { src: `${site.basePath}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${site.basePath}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${site.basePath}/apple-touch-icon-1024x1024.png`, sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: `${site.basePath}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
