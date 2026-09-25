import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-bricolage" });
const body = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-instrument" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Break-even",
  description: "How many customers pay the rent? A stateless profitability projection: every setting lives in the link.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F6F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1220" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* A link with settings would otherwise flash the default report before the query is applied. */}
        <script dangerouslySetInnerHTML={{ __html: `if(location.search.length>1)document.documentElement.setAttribute("data-loading","")` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
