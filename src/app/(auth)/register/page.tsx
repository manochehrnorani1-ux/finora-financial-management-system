import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/seed";
import { RegisterForm } from "../AuthForms";

export default async function RegisterPage() {
  await ensureBootstrap();
  if (await getSessionUser()) redirect("/dashboard");
  return <RegisterForm />;
}
