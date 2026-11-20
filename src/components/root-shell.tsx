import type { ReactNode } from "react";
import { fontClassNames } from "@/lib/fonts";

/** The document around every page. The CMS brand's colours (already checked, lib/brand.ts) arrive as one style rule. */
export function RootShell({
  locale,
  brandCss,
  bodyClassName,
  children,
}: {
  locale: string;
  brandCss: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <html lang={locale} className={fontClassNames} data-theme="dark">
      {/* The App Router's root layout may hold <head>; it carries the brand colours. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>{brandCss ? <style>{brandCss}</style> : null}</head>
      <body className={bodyClassName}>{children}</body>
    </html>
  );
}
