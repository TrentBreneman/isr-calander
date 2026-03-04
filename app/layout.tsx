import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iSolvRisk Calendar",
  description: "A simple, modern calendar for our company.",
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
