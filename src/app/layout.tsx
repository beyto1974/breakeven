import type { Metadata, Viewport } from "next";
// Fonts ship with the build (no request to a font CDN at build or run time).
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* A link with settings would otherwise flash the default report before the query is applied. */}
        <script dangerouslySetInnerHTML={{ __html: `if(location.search.length>1)document.documentElement.setAttribute("data-loading","")` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
