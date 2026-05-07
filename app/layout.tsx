import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Micha Ophir — Product Leader & Builder",
  description:
    "Senior Product Manager with 15+ years across fintech, audio/media, and adtech. Exploring AI-native tools and building in public.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
