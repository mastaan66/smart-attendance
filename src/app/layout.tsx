import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DemoProvider } from "@/context/DemoContext";
import DemoBanner from "@/components/DemoBanner";
import SidebarWrapper from "@/components/SidebarWrapper";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Smart Campus | Enterprise Attendance",
  description: "Advanced Geo-Fencing & Facial Recognition Attendance System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Smart Campus",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b5cff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <DemoProvider>
            <DemoBanner />
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              <SidebarWrapper>
                {children}
              </SidebarWrapper>
            </ThemeProvider>
          </DemoProvider>
        </Providers>
      </body>
    </html>
  );
}
