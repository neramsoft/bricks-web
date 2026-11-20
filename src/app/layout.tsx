import type { Metadata } from "next";
import "./globals.css";

const DEFAULT_LOCALE = "bs";

export const metadata: Metadata = {
  title: "Bricks",
  robots: { index: false, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>{children}</body>
    </html>
  );
}
