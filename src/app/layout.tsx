import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getT } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { getContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: {
    template: "%s — FINORA",
    default: "FINORA — سیستم مدیریت مالی و خدمات اداری افغانستان",
  },
  description: "Financial & administrative management system for organizations in Afghanistan",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { lang, dir, dict } = await getT();
  let dateFormat: "jalali" | "gregorian" = "jalali";
  try {
    const ctx = await getContext();
    if (ctx?.org.dateFormat === "gregorian") dateFormat = "gregorian";
  } catch {
    /* unauthenticated */
  }
  return (
    <html lang={lang} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <I18nProvider value={{ lang, dir, dict, dateFormat }}>{children}</I18nProvider>
      </body>
    </html>
  );
}
