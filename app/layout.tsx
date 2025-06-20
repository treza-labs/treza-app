import "./css/style.css";

import { Inter } from "next/font/google";
import localFont from "next/font/local";

import SidePanel from "@/components/ui/side-panel";
import PrivyWrapper from "@/components/providers/privy-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const nacelle = localFont({
  src: [
    {
      path: "../public/fonts/nacelle-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/nacelle-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/nacelle-semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/nacelle-semibolditalic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--font-nacelle",
  display: "swap",
});

export const metadata = {
  title: "Treza – AI Agents for Crypto Execution",
  description: "Deploy AI-powered agents that monitor markets, analyze data, and execute strategies on-chain. Built for crypto-native teams and automated trading flows.",
  icons: {
    icon: [
      { url: '/images/treza-logo-header.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/treza-logo-header.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/images/treza-logo-header.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/images/treza-logo-header.png',
      },
    ],
  },
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Treza',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${nacelle.variable} bg-gray-950 font-inter text-base text-gray-200 antialiased`}
      >
        <PrivyWrapper>
          <div className="flex min-h-screen overflow-hidden supports-[overflow:clip]:overflow-clip">
            <SidePanel />
            <main className="flex-1 md:ml-64 bg-gray-950">
              {children}
            </main>
          </div>
        </PrivyWrapper>
      </body>
    </html>
  );
}
