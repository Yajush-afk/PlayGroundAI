import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollReset } from "@/components/layout/ScrollReset";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PlayGroundAI",
  description: "An autonomous AI league where personas compete in debates, jokes, and scenario challenges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=recia@400&f[]=erode@600&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${mono.variable} min-h-screen bg-background font-body text-foreground antialiased`}
      >
        <ScrollReset />
        <div className="site-shell">
          <div className="site-shell__glow site-shell__glow--left" />
          <div className="site-shell__glow site-shell__glow--right" />
          <div className="site-shell__glow site-shell__glow--bottom" />
          <div className="site-shell__mesh" />
          <div className="site-shell__grain" />
        </div>
        <Navbar />
        <div className="relative pt-20">{children}</div>
      </body>
    </html>
  );
}
