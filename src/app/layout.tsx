import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import FireOverlay from "@/components/FireOverlay";
import GlobalTimer from "@/components/GlobalTimer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HackArena 2K26 — Code. Compete. Conquer.",
  description: "HackArena 2K26: Real-time monitored hackathon system with automated anti-cheat, live deployment scoring, and strike enforcement.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/hackarena-logo.png",
  },
  openGraph: {
    title: "HackArena 2K26",
    description: "HackArena 2K26: Real-time monitored hackathon system.",
    type: "website",
    url: "https://hack-arena-snowy.vercel.app/",
    siteName: "HackArena",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} scroll-smooth`} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Pre-hydration black cover — renders as raw HTML before React. Removed by FireOverlay when WebGL is ready */}
        <div
          id="fire-precover"
          style={{ position: "fixed", inset: 0, zIndex: 99999, background: "#000", pointerEvents: "none" }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              setTimeout(function(){
                var e=document.getElementById('fire-precover');
                if(e){e.style.transition='opacity 0.3s';e.style.opacity='0';setTimeout(function(){e.remove()},400)}
              },4000)
            })();`,
          }}
        />
        <FireOverlay />
        <GlobalTimer />
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
