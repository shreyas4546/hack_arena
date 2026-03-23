import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import Preloader from "@/components/Preloader";
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
    <html lang="en" className={geistSans.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Preloader />
        <GlobalTimer />
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
