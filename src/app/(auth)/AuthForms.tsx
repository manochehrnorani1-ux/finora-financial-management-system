"use client";
import { useActionState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction, registerAction, setLanguageAction } from "@/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n/dictionary";
import { useErrorText, btnClass } from "@/components/forms";
import type { ActionResult } from "@/actions/util";

function LangBar() {
  const { lang } = useI18n();
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <div className="flex justify-center gap-2 text-xs">
      {LANGS.map((l) => (
        <button key={l.code} type="button" onClick={() => start(async () => { await setLanguageAction(l.code); router.refresh(); })} className={`px-2 py-1 rounded ${lang === l.code ? "bg-emerald-700 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

function Frame({ children, title }: { children: React.ReactNode; title: string }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-8 space-y-5">
        <div className="text-center">
          <div className="text-3xl font-black text-emerald-700">{t("appName")}</div>
          <div className="text-xs text-slate-500 mt-1">{t("appTagline")}</div>
        </div>
        <h1 className="text-lg font-semibold text-slate-800 text-center">{title}</h1>
        {children}
        <LangBar />
      </div>
    </div>
  );
}

export function LoginForm({ demoHint }: { demoHint: { email: string; password: string; others: string[] } | null }) {
  const { t } = useI18n();
  const errText = useErrorText();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(loginAction, null);
  return (
    <Frame title={t("login")}>
      <form action={action} className="space-y-3">
        <label className="block text-sm"><span className="text-slate-600">{t("email")}</span><input name="email" type="email" required className="input mt-1" dir="ltr" autoComplete="email" /></label>
        <label className="block text-sm"><span className="text-slate-600">{t("password")}</span><input name="password" type="password" required className="input mt-1" dir="ltr" autoComplete="current-password" /></label>
        {state && !state.ok && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{errText(state.error)}</p>}
        <button disabled={pending} className={`${btnClass("primary")} w-full`}>{pending ? "…" : t("login")}</button>
      </form>
      <p className="text-center text-sm text-slate-500">{t("noAccount")} <Link href="/register" className="text-emerald-700 font-medium">{t("register")}</Link></p>
      {demoHint && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900" dir="ltr">
          <div className="font-semibold mb-1">{t("demoCredentials")}</div>
          <div>{demoHint.email} / {demoHint.password}</div>
          <div className="text-amber-700 mt-1">{demoHint.others.join(" · ")} / Demo@123</div>
        </div>
      )}
    </Frame>
  );
}

export function RegisterForm() {
  const { t } = useI18n();
  const errText = useErrorText();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(registerAction, null);
  return (
    <Frame title={t("register")}>
      <form action={action} className="space-y-3">
        <label className="block text-sm"><span className="text-slate-600">{t("fullName")}</span><input name="fullName" required className="input mt-1" /></label>
        <label className="block text-sm"><span className="text-slate-600">{t("organizationName")}</span><input name="organizationName" required className="input mt-1" /></label>
        <label className="block text-sm"><span className="text-slate-600">{t("email")}</span><input name="email" type="email" required className="input mt-1" dir="ltr" /></label>
        <label className="block text-sm"><span className="text-slate-600">{t("password")}</span><input name="password" type="password" required minLength={6} className="input mt-1" dir="ltr" /></label>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="startWithDemo" defaultChecked className="accent-emerald-700" />{t("createDemo")}</label>
        {state && !state.ok && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{errText(state.error)}</p>}
        <button disabled={pending} className={`${btnClass("primary")} w-full`}>{pending ? "…" : t("register")}</button>
      </form>
      <p className="text-center text-sm text-slate-500">{t("haveAccount")} <Link href="/login" className="text-emerald-700 font-medium">{t("login")}</Link></p>
    </Frame>
  );
}
