import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallProvider } from "@/components/pwa-install-prompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#123B5D",
};

export function generateMetadata(): Metadata {
  const appName = process.env.APP_NAME || "Revenue Management System";
  return {
    title: appName,
    description:
      `Revenue Management System. Manage bills, payments, businesses, properties, rents, and building permits.`,
    keywords: [
      "digital services",
      "revenue management",
      "RMS",
      "bills",
      "payments",
    ],
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: appName,
    },
    icons: {
      icon: "/pwa/icon-192x192.png",
      apple: "/pwa/apple-touch-icon.png",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png" />
        <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Caveat:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PwaInstallProvider>
            {children}
            <Toaster />
            <PwaRegister />
          </PwaInstallProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
