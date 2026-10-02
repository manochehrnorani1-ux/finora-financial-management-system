# FINORA Browser E2E

This suite is separate from normal TypeScript/ESLint/build CI and is run manually against a deployed FINORA environment.

Required environment variables/secrets:
- E2E_BASE_URL
- E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
- E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD
- E2E_ACCOUNTANT_EMAIL / E2E_ACCOUNTANT_PASSWORD
- E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD
- E2E_VIEWER_EMAIL / E2E_VIEWER_PASSWORD

No credentials are committed to the repository.

Run locally:

```bash
npm install
npx playwright install chromium
npm run e2e
```

If credentials for a role are absent, its authenticated tests are explicitly skipped as NOT VERIFIED. The suite never creates users, organizations, financial records, or migrations to manufacture a passing result.

The suite covers public smoke pages, unauthenticated route boundaries, login validation, authenticated session refresh/logout, system-management route boundaries, organization switching when the authenticated admin actually has at least two memberships, and a mobile overflow smoke check.

Full CRUD/accounting/tax/report workflows are deliberately not fabricated; they require dedicated real test fixtures and valid credentials.
