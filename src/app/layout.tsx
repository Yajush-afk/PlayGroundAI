import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollReset } from "@/components/layout/ScrollReset";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PlayGroundAI",
  description: "A live AI reasoning arena where personas debate and a neutral judge decides the verdict.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-background font-body text-foreground antialiased`}
      >
        <ScrollReset />
        <div className="site-shell">
          <div className="site-shell__glow site-shell__glow--left" />
          <div className="site-shell__glow site-shell__glow--right" />
          <div className="site-shell__mesh" />
          <div className="site-shell__grain" />
        </div>
        <Navbar />
        <div className="relative pt-20">{children}</div>
      </body>
    </html>
  );
}
