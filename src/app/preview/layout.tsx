import type { ReactNode } from "react";
import "../globals.css";
import { RootShell } from "@/components/root-shell";
import { brandCss } from "@/lib/brand";
import { getSiteData } from "@/lib/data";

export default async function PreviewLayout({ children }: { children: ReactNode }) {
  const site = await getSiteData();
  return (
    <RootShell locale={site.defaultLocale} brandCss={brandCss(site.brand)}>
      {children}
    </RootShell>
  );
}
