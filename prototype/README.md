# Prototype — Manochehr-norani-main (DAB Forms Workspace)

Vendored verbatim snapshot of the AI-Studio DAB forms prototype (2026-09-29),
uploaded by the user and preserved exactly as in `Manochehr-norani-main.zip`.

- This is a **standalone Next.js app**. It is NOT part of FINORA's build:
  excluded from `tsc --noEmit` (`tsconfig.json`) and from ESLint.
  Next.js only treats `src/app` as routes, so `prototype/*/app` is inert.
- Its DAB form **content** (47 form definitions, field catalogs, renewal
  requirements) was merged into FINORA's `src/lib/forms-catalog.ts`
  (57 templates) — see `workspace/goals/workflow-finora/hidden_files/merge/`.
- Reference only: do not import from here into `src/`.

Note: `bun.lock` (generated lockfile) and `components/ComplianceReporting.tsx`
(oversize for the push tool) were not vendored; the zip in
`workspace/user/files/` remains the complete original.
