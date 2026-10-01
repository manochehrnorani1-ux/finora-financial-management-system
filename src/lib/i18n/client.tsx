"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "./dictionary";

interface I18nValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  dict: Record<string, string>;
  dateFormat: "jalali" | "gregorian";
}

const Ctx = createContext<I18nValue>({ lang: "fa", dir: "rtl", dict: {}, dateFormat: "jalali" });

export function I18nProvider({ value, children }: { value: I18nValue; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  return { ...v, t: (k: string) => v.dict[k] ?? k };
}
