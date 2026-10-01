import { Tabs } from "@/components/ui";

/** Shared navigation for the dedicated Tax Settlement section. */
export function TaxNav({ active, t }: { active: "overview" | "returns" | "engine" | "types"; t: (k: string) => string }) {
  return (
    <Tabs
      active={active}
      items={[
        { key: "overview", href: "/tax-settlements", label: `⚖ ${t("settlementOverview")}` },
        { key: "returns", href: "/tax-returns", label: `🖨 ${t("taxReturns")}` },
        { key: "engine", href: "/tax-engine", label: `⚙ ${t("taxEngine")}` },
        { key: "types", href: "/taxes", label: `🏛 ${t("taxes")}` },
      ]}
    />
  );
}
