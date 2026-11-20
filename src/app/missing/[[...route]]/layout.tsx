import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../globals.css";
import { LocaleLayout } from "@/components/locale-layout";

export const metadata: Metadata = { icons: { icon: "/brand/mark.svg" } };

export default function MissingLayout(props: {
  children: ReactNode;
  params: Promise<{ route?: string[] }>;
}) {
  return <LocaleLayout {...props} />;
}
