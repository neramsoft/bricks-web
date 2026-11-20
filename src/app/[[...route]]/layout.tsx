import type { ReactNode } from "react";
import "../globals.css";
import { LocaleLayout } from "@/components/locale-layout";

export default function RootLayout(props: {
  children: ReactNode;
  params: Promise<{ route?: string[] }>;
}) {
  return <LocaleLayout {...props} />;
}
