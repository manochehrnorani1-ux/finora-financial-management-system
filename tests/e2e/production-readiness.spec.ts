import { test, expect, type Page } from "@playwright/test";

type RoleKey = "admin" | "manager" | "accountant" | "operator" | "viewer";

const roleCredentials: Record<RoleKey, { email?: string; password?: string }> = {
  admin: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
  manager: { email: process.env.E2E_MANAGER_EMAIL, password: process.env.E2E_MANAGER_PASSWORD },
  accountant: { email: process.env.E2E_ACCOUNTANT_EMAIL, password: process.env.E2E_ACCOUNTANT_PASSWORD },
  operator: { email: process.env.E2E_OPERATOR_EMAIL, password: process.env.E2E_OPERATOR_PASSWORD },
  viewer: { email: process.env.E2E_VIEWER_EMAIL, password: process.env.E2E_VIEWER_PASSWORD },
};

const protectedRoutes = ["/dashboard", "/customers", "/cases", "/panel/services", "/documents-center", "/finance-center", "/tax-settlements", "/reports"];
const systemRoutes = ["/admin-center", "/users", "/audit", "/backup"];

async function login(page: Page, role: RoleKey) {
  const credentials = roleCredentials[role];
  test.skip(!credentials.email || !credentials.password, `NOT VERIFIED: credentials unavailable for ${role}`);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(credentials.email!);
  await page.locator('input[name="password"]').fill(credentials.password!);
  await page.getByRole("button", { name: /login|ورود|ننوتل/i }).click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 15000 });
}

test.describe("public production smoke", () => {
  for (const route of ["/", "/services", "/about", "/contact"]) {
    test(`loads ${route} without page/runtime failure`, async ({ page }) => {
      const serverErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("response", (response) => {
        if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
      expect(serverErrors, serverErrors.join("\n")).toEqual([]);
      expect(pageErrors, pageErrors.join("\n")).toEqual([]);
    });
  }
});

test.describe("unauthenticated boundary", () => {
  for (const route of [...protectedRoutes, ...systemRoutes]) {
    test(`rejects unauthenticated access to ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(new RegExp(route.replaceAll("/", "\\/") + "(?:$|[?#])"));
    });
  }
});

test.describe("authentication E2E", () => {
  test("invalid credentials remain on login", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="email"]').fill("e2e-invalid@example.invalid");
    await page.locator('input[name="password"]').fill("definitely-invalid");
    await page.getByRole("button", { name: /login|ورود|ننوتل/i }).click();
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
  });

  test("empty credentials are blocked by form validation", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[name="email"]')).toHaveAttribute("required", "");
    await expect(page.locator('input[name="password"]')).toHaveAttribute("required", "");
    await page.getByRole("button", { name: /login|ورود|ننوتل/i }).click();
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
  });

  test("admin session survives refresh and logout blocks protected route", async ({ page }) => {
    await login(page, "admin");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/);
    const logout = page.getByRole("button", { name: /logout|خروج|وتل/i });
    await expect(logout).toBeVisible();
    await logout.click();
    await page.waitForURL(/\/login(?:[/?#]|$)/, { timeout: 10000 });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/dashboard(?:[/?#]|$)/);
  });
});

test.describe("role and system-management E2E", () => {
  for (const role of Object.keys(roleCredentials) as RoleKey[]) {
    test(`${role}: dashboard session and system boundary`, async ({ page }) => {
      await login(page, role);
      await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/);
      for (const route of systemRoutes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        if (role === "admin") {
          await expect(page).toHaveURL(new RegExp(route.replaceAll("/", "\\/") + "(?:$|[?#])"));
        } else {
          await expect(page).not.toHaveURL(new RegExp(route.replaceAll("/", "\\/") + "(?:$|[?#])"));
        }
      }
    });
  }
});

test.describe("organization switching E2E", () => {
  test("admin can switch organization and refresh dashboard state", async ({ page }) => {
    await login(page, "admin");
    const switcher = page.locator('select[title*="organization"], select[title*="سازمان"], select[title*="سازمان بدلول"]');
    test.skip((await switcher.count()) === 0, "NOT VERIFIED: no organization switcher is available for this session");
    const optionCount = await switcher.locator("option").count();
    test.skip(optionCount < 2, "NOT VERIFIED: this session has fewer than two organizations");

    const firstValue = await switcher.inputValue();
    const options = await switcher.locator("option").evaluateAll((els) =>
      els.map((el) => ({ value: (el as HTMLOptionElement).value, text: el.textContent?.trim() ?? "" })),
    );
    const second = options.find((option) => option.value !== firstValue)!;

    await switcher.selectOption(second.value);
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(switcher).toHaveValue(second.value);

    const first = options.find((option) => option.value === firstValue)!;
    await switcher.selectOption(first.value);
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(switcher).toHaveValue(first.value);
  });
});

test.describe("mobile smoke", () => {
  test("dashboard has no horizontal overflow for an authenticated admin", async ({ page }) => {
    await login(page, "admin");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  });
});
