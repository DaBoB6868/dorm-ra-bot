import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AURA — AI-powered University Resident Assistant",
  description: "Your AI-powered UGA dorm assistant — ask about campus resources, dorm policies, and residential life",
  keywords: ["AURA", "UGA", "dorm", "RA", "resident assistant", "housing", "Georgia", "AI"],
  openGraph: {
    title: "AURA — AI-powered University Resident Assistant",
    description: "Your AI-powered UGA dorm assistant",
    type: "website",
    url: "https://ra-bot.tech",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
