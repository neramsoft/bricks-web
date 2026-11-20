import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../globals.css";
import { RootShell } from "@/components/root-shell";
import { brandCss } from "@/lib/brand";
import { getSiteData } from "@/lib/data";

export const metadata: Metadata = { icons: { icon: "/brand/mark.svg" } };

export default async function FormResultLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale?: string[] }>;
}) {
  const { locale } = await params;
  const site = await getSiteData();
  const code = locale?.[0]?.toLowerCase();
  const known = site.languages.find((language) => language.code.toLowerCase() === code);
  return (
    <RootShell locale={known?.code ?? site.defaultLocale} brandCss={brandCss(site.brand)}>
      {children}
    </RootShell>
  );
}
