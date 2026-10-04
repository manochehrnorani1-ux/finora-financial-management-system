"use client";

import { useEffect } from "react";

export default function WorkflowTarget({ target }: { target?: string | null }) {
  useEffect(() => {
    if (!target) return;
    const selectors: Record<string, string> = {
      payment: "[data-workflow-target='payment']",
      "step-complete": "[data-workflow-target='step-complete']",
      documents: "[data-workflow-target='documents']",
      "service-action": "[data-workflow-target='service-action']",
    };
    const selector = selectors[target];
    if (!selector) return;
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.classList.add("ring-2", "ring-amber-400", "ring-offset-2");
    const timer = window.setTimeout(() => node.classList.remove("ring-2", "ring-amber-400", "ring-offset-2"), 5000);
    return () => window.clearTimeout(timer);
  }, [target]);
  return null;
}
