import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visual Music Experiments",
  description: "A gallery of interactive visual music experiments",
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
