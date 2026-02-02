import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visual Music - Circle Animation",
  description: "Mathematical circle animation with visual rules",
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
