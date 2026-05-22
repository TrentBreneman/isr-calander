import type { Metadata } from "next";
import "./globals.css";
import ToolsMenu from "@/components/ToolsMenu";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "iSolvRisk Calendar",
  description: "A simple, modern calendar for our company.",
  other: {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; connect-src 'self' https://pegxercwtohljdlelrdy.supabase.co https://*.tesseract.js.org https://*.projectnaptha.com https://unpkg.com https://cdn.jsdelivr.net; worker-src 'self' blob:; frame-ancestors 'none'; upgrade-insecure-requests;",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <ToolsMenu />
        </QueryProvider>
      </body>
    </html>
  );
}
