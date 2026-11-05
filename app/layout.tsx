import type { Metadata, Viewport } from "next";
import { Barlow, Fraunces, Oswald } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";
import { site } from "@/lib/site";

const display = Oswald({ subsets: ["latin"], variable: "--font-display" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", style: ["normal", "italic"] });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

const apple = `${site.basePath}/apple-touch-icon`;

export const metadata: Metadata = {
  title: site.name,
  description: "A personal log for benchmark workouts and lifting PRs.",
  icons: {
    icon: [{ url: `${site.basePath}/icon-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [
      { url: `${apple}.png`, sizes: "180x180", type: "image/png" },
      { url: `${apple}-240x240.png`, sizes: "240x240", type: "image/png" },
      { url: `${apple}-1024x1024.png`, sizes: "1024x1024", type: "image/png" },
    ],
  },
  appleWebApp: { capable: true, title: site.homeScreenName, statusBarStyle: "black-translucent" },
  other: { "apple-mobile-web-app-capable": "yes" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0c0907",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" className={`${display.variable} ${serif.variable} ${body.variable} h-full antialiased`} style={{ "--login-photo": `url(${site.basePath}/photos/login.jpg)` } as React.CSSProperties}>
      <head>
        <link rel="apple-touch-icon" href={`${apple}.png`} />
        <link rel="apple-touch-icon" sizes="180x180" href={`${apple}-180x180.png`} />
        <link rel="apple-touch-icon" sizes="192x192" href={`${site.basePath}/icon-192.png`} />
        <link rel="apple-touch-icon" sizes="240x240" href={`${apple}-240x240.png`} />
        <link rel="apple-touch-icon" sizes="1024x1024" href={`${apple}-1024x1024.png`} />
        <link rel="apple-touch-icon-precomposed" href={`${apple}-precomposed.png`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
