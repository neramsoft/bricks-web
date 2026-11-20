import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../globals.css";
import { RootShell } from "@/components/root-shell";
import { brandCss } from "@/lib/brand";
import { tableRequest } from "@/ordering/request";

export const metadata: Metadata = {
  icons: { icon: "/brand/mark.svg" },
  robots: { index: false, follow: true },
};

/** The document of a table page: `lang` follows the language the page is drawn in. */
export default async function TableLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { site, locale } = await tableRequest(token);
  return (
    <RootShell locale={locale} brandCss={brandCss(site.brand)} bodyClassName="ord-body">
      {children}
    </RootShell>
  );
}
