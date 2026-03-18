import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iSolvRisk Calendar",
  description: "A simple, modern calendar for our company.",
  other: {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; connect-src 'self' https://pegxercwtohljdlelrdy.supabase.co; frame-ancestors 'none'; upgrade-insecure-requests;",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
