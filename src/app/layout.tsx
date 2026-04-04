import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { registerBuiltinAddons } from "@/lib/addons/registry";
import { RouteAnnouncerPatch } from "@/components/RouteAnnouncerPatch";

registerBuiltinAddons();

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flight App",
  description: "A flight application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <RouteAnnouncerPatch />
      </body>
    </html>
  );
}
