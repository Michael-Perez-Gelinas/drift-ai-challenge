import type { Metadata, Viewport } from "next";
import { Permanent_Marker, DM_Sans } from "next/font/google";
import "./globals.css";

const permanentMarker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Drift — Boston Food Truck",
  description: "Find Drift today. Fresh Mexican street food, moving around Boston.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#A8522B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${permanentMarker.variable} ${dmSans.variable}`}>
      <body className="font-body bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
