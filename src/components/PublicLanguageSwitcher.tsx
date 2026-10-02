"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LANGS, type Lang } from "@/lib/i18n/dictionary";
import { setLanguageAction } from "@/actions/auth";

export function PublicLanguageSwitcher({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {LANGS.map((item) => (
        <button
          key={item.code}
          type="button"
          disabled={pending}
          aria-pressed={lang === item.code}
          onClick={() => start(async () => {
            await setLanguageAction(item.code);
            router.refresh();
          })}
          className={`rounded-lg px-2.5 py-1.5 text-xs transition ${lang === item.code ? "bg-emerald-500/15 font-black text-emerald-300" : "text-slate-500 hover:bg-white/5 hover:text-white"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
