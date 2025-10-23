import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AutoLogoutProvider } from "@/components/providers/auto-logout-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PBXR - Manage your monitoring targets",
  description: "PBXR is a tool to manage your monitoring targets for Prometheus Blackbox Exporter.",
  keywords: ["PBXR", "Prometheus", "Blackbox Exporter", "monitoring", "targets"],
  authors: [{ name: "PBXR Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "PBXR - Manage your monitoring targets",
    description: "A tool to manage your monitoring targets for Prometheus Blackbox Exporter.",
    url: "https://github.com/jrspru/prometheus-blackbox-exporter-ui",
    siteName: "PBXR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PBXR - Manage your monitoring targets",
    description: "A tool to manage your monitoring targets for Prometheus Blackbox Exporter.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AutoLogoutProvider>
            {children}
          </AutoLogoutProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
