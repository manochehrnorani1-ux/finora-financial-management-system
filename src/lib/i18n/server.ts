import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDictionary, translate, type Lang, dirOf } from "./dictionary";

export const LANG_COOKIE = "finora_lang";

export const getLang = cache(async (): Promise<Lang> => {
  const store = await cookies();
  const v = store.get(LANG_COOKIE)?.value;
  return v === "ps" || v === "en" ? v : "fa";
});

export async function getT() {
  const lang = await getLang();
  const t = (key: string) => translate(lang, key);
  return { lang, t, dir: dirOf(lang), dict: getDictionary(lang) };
}
