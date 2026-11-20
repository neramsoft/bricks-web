import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../globals.css";
import { RootShell } from "@/components/root-shell";
import { brandCss } from "@/lib/brand";
import { guestLocale } from "@/ordering/request";

export const metadata: Metadata = {
  icons: { icon: "/brand/mark.svg" },
  robots: { index: false, follow: true },
};

export default async function InvalidLayout({ children }: { children: ReactNode }) {
  const { site, asked } = await guestLocale();
  return (
    <RootShell
      locale={asked ?? site.defaultLocale}
      brandCss={brandCss(site.brand)}
      bodyClassName="ord-body"
    >
      {children}
    </RootShell>
  );
}
