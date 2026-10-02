import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { Card, PageHeader } from "@/components/ui";

export default async function ForbiddenPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-2xl">🔒</div>
        <PageHeader title={t("accessDenied")} subtitle={t("accessDeniedHelp")} />
        <Link href="/dashboard" className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">{t("backToDashboard")}</Link>
      </Card>
    </div>
  );
}
