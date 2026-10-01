import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_ADMIN, ensureBootstrap } from "@/lib/seed";
import { LoginForm } from "../AuthForms";

export default async function LoginPage() {
  await ensureBootstrap();
  if (await getSessionUser()) redirect("/dashboard");
  return <LoginForm demoHint={{ email: DEFAULT_ADMIN.email, password: DEFAULT_ADMIN.password, others: ["manager@finora.af", "accountant@finora.af", "operator@finora.af", "viewer@finora.af"] }} />;
}
