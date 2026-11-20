import type { ReactNode } from "react";

/** The document around every page. The CMS brand's colours (already checked, lib/brand.ts) arrive as one style rule. */
export function RootShell({
  locale,
  brandCss,
  children,
}: {
  locale: string;
  brandCss: string;
  children: ReactNode;
}) {
  return (
    <html lang={locale}>
      {/* The App Router's root layout may hold <head>; it carries the brand colours. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>{brandCss ? <style>{brandCss}</style> : null}</head>
      <body>{children}</body>
    </html>
  );
}
