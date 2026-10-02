"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  customerBankAccounts,
  customerBranches,
  customerEmployees,
  customerGuarantees,
  customerLicenses,
  customerShareholders,
  customers,
  attachments,
} from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { audit, FinanceError } from "@/lib/finance";
import { optStr, str, num } from "@/lib/format";
import { act } from "./util";

function optionalInt(v: FormDataEntryValue | null) {
  const s = optStr(v);
  return s ? Number.parseInt(s, 10) : null;
}

async function requireCustomer(customerId: string, organizationId: string) {
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)));
  if (!customer) throw new FinanceError("not_found");
  return customer;
}

export async function saveCustomerLicense(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("customers.write");
    const id = optStr(fd.get("id"));
    const customerId = str(fd.get("customerId"));
    const data = {
      customerId,
      organizationId: ctx.org.id,
      licenseNumber: str(fd.get("licenseNumber")),
      licenseType: str(fd.get("licenseType")) || "money_services",
      issuingAuthority: optStr(fd.get("issuingAuthority")),
      issueDate: optStr(fd.get("issueDate")),
      expiryDate: optStr(fd.get("expiryDate")),
      activity: optStr(fd.get("activity")),
      serviceTypes: str(fd.get("serviceTypes")).split(/\r?\n/).map((x) => x.trim()).filter(Boolean),
      requiredCapital: num(fd.get("requiredCapital")),
      workingCapital: num(fd.get("workingCapital")),
      guaranteeAmount: num(fd.get("guaranteeAmount")),
      status: str(fd.get("status")) || "active",
      notes: optStr(fd.get("notes")),
      createdBy: ctx.user.id,
      updatedAt: new Date(),
    };
    if (!data.licenseNumber) throw new FinanceError("invalid_input");
    await db.transaction(async (tx) => {
      const [customer] = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.org.id)));
      if (!customer) throw new FinanceError("not_found");
      if (id) {
        const [old] = await tx.select().from(customerLicenses).where(and(eq(customerLicenses.id, id), eq(customerLicenses.organizationId, ctx.org.id), eq(customerLicenses.customerId, customerId)));
        if (!old) throw new FinanceError("not_found");
        await tx.update(customerLicenses).set(data).where(eq(customerLicenses.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "customer_license", entityId: id, oldData: old, newData: data });
        return;
      }
      const [row] = await tx.insert(customerLicenses).values(data).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "customer_license", entityId: row.id, newData: row });
    });
  });
}

export async function saveCustomerShareholder(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("customers.write");
    const id = optStr(fd.get("id"));
    const customerId = str(fd.get("customerId"));
    const data = {
      organizationId: ctx.org.id, customerId, fullName: str(fd.get("fullName")),
      fatherName: optStr(fd.get("fatherName")), grandfatherName: optStr(fd.get("grandfatherName")),
      nationalId: optStr(fd.get("nationalId")), tin: optStr(fd.get("tin")), phone: optStr(fd.get("phone")), email: optStr(fd.get("email")),
      province: optStr(fd.get("province")), district: optStr(fd.get("district")), area: optStr(fd.get("area")), village: optStr(fd.get("village")), address: optStr(fd.get("address")),
      educationLevel: optStr(fd.get("educationLevel")), educationField: optStr(fd.get("educationField")),
      workExperienceYears: optionalInt(fd.get("workExperienceYears")),
      ownershipPercentage: num(fd.get("ownershipPercentage")), shareValue: num(fd.get("shareValue")),
      role: optStr(fd.get("role")), status: str(fd.get("status")) || "active", notes: optStr(fd.get("notes")), createdBy: ctx.user.id, updatedAt: new Date(),
    };
    if (!data.fullName) throw new FinanceError("invalid_input");
    await requireCustomer(customerId, ctx.org.id);
    if (id) {
      const [old] = await db.select().from(customerShareholders).where(and(eq(customerShareholders.id, id), eq(customerShareholders.organizationId, ctx.org.id), eq(customerShareholders.customerId, customerId)));
      if (!old) throw new FinanceError("not_found");
      await db.update(customerShareholders).set(data).where(eq(customerShareholders.id, id));
      await audit(db, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "customer_shareholder", entityId: id, oldData: old, newData: data });
      return { id };
    }
    const [created] = await db.insert(customerShareholders).values(data).returning();
    await audit(db, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "customer_shareholder", entityId: created.id, newData: created });
    return { id: created.id };
  });
}
export async function saveCustomerEmployee(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("customers.write");
    const id = optStr(fd.get("id"));
    const customerId = str(fd.get("customerId"));
    const data = {
      organizationId: ctx.org.id, customerId, fullName: str(fd.get("fullName")),
      fatherName: optStr(fd.get("fatherName")), grandfatherName: optStr(fd.get("grandfatherName")), nationalId: optStr(fd.get("nationalId")), tin: optStr(fd.get("tin")),
      phone: optStr(fd.get("phone")), email: optStr(fd.get("email")), position: optStr(fd.get("position")), department: optStr(fd.get("department")),
      educationLevel: optStr(fd.get("educationLevel")), educationField: optStr(fd.get("educationField")),
      workExperienceYears: optionalInt(fd.get("workExperienceYears")), employmentDate: optStr(fd.get("employmentDate")), salary: num(fd.get("salary")),
      province: optStr(fd.get("province")), district: optStr(fd.get("district")), area: optStr(fd.get("area")), address: optStr(fd.get("address")),
      status: str(fd.get("status")) || "active", notes: optStr(fd.get("notes")), createdBy: ctx.user.id, updatedAt: new Date(),
    };
    if (!data.fullName) throw new FinanceError("invalid_input");
    await requireCustomer(customerId, ctx.org.id);
    if (id) {
      const [old] = await db.select().from(customerEmployees).where(and(eq(customerEmployees.id, id), eq(customerEmployees.organizationId, ctx.org.id), eq(customerEmployees.customerId, customerId)));
      if (!old) throw new FinanceError("not_found");
      await db.update(customerEmployees).set(data).where(eq(customerEmployees.id, id));
      return { id };
    }
    const [row] = await db.insert(customerEmployees).values(data).returning();
    return { id: row.id };
  });
}

export async function saveCustomerBranch(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("customers.write");
    const id = optStr(fd.get("id"));
    const customerId = str(fd.get("customerId"));
    const data = {
      organizationId: ctx.org.id, customerId, branchNumber: optStr(fd.get("branchNumber")), name: optStr(fd.get("name")),
      province: optStr(fd.get("province")), district: optStr(fd.get("district")), area: optStr(fd.get("area")), village: optStr(fd.get("village")),
      market: optStr(fd.get("market")), floor: optStr(fd.get("floor")), shopNumber: optStr(fd.get("shopNumber")), address: optStr(fd.get("address")),
      phone: optStr(fd.get("phone")), email: optStr(fd.get("email")), representativeEmployeeId: optStr(fd.get("representativeEmployeeId")),
      licenseNumber: optStr(fd.get("licenseNumber")), issueDate: optStr(fd.get("issueDate")), expiryDate: optStr(fd.get("expiryDate")),
      status: str(fd.get("status")) || "active", notes: optStr(fd.get("notes")), createdBy: ctx.user.id, updatedAt: new Date(),
    };
    await requireCustomer(db, customerId, ctx.org.id);
    if (data.representativeEmployeeId) {
      const [employee] = await db.select({ id: customerEmployees.id }).from(customerEmployees).where(and(
        eq(customerEmployees.id, data.representativeEmployeeId),
        eq(customerEmployees.organizationId, ctx.org.id),
        eq(customerEmployees.customerId, customerId),
      ));
      if (!employee) throw new FinanceError("not_found");
    }
    if (id) { await db.update(customerBranches).set(data).where(and(eq(customerBranches.id,id),eq(customerBranches.organizationId,ctx.org.id),eq(customerBranches.customerId,customerId))); return {id}; }
    const [row] = await db.insert(customerBranches).values(data).returning(); return {id:row.id};
  });
}

export async function saveCustomerBankAccount(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("customers.write");
    const id = optStr(fd.get("id")); const customerId = str(fd.get("customerId"));
    const data = {
      organizationId: ctx.org.id, customerId, bankName: str(fd.get("bankName")), accountName: str(fd.get("accountName")),
      accountNumber: str(fd.get("accountNumber")), branchNumber: optStr(fd.get("branchNumber")), currency: str(fd.get("currency")) || "AFN",
      status: str(fd.get("status")) || "active", notes: optStr(fd.get("notes")), createdBy: ctx.user.id, updatedAt: new Date(),
    };
    if (!data.bankName || !data.accountName || !data.accountNumber) throw new FinanceError("invalid_input");
    await requireCustomer(db, customerId, ctx.org.id);
    if (id) { await db.update(customerBankAccounts).set(data).where(and(eq(customerBankAccounts.id,id),eq(customerBankAccounts.organizationId,ctx.org.id),eq(customerBankAccounts.customerId,customerId))); return {id}; }
    const [row] = await db.insert(customerBankAccounts).values(data).returning(); return {id:row.id};
  });
}

export async function saveCustomerGuarantee(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("customers.write");
    const id = optStr(fd.get("id")); const customerId = str(fd.get("customerId"));
    const data = {
      organizationId: ctx.org.id, customerId, beneficiaryShareholderId: optStr(fd.get("beneficiaryShareholderId")),
      guarantorName: str(fd.get("guarantorName")), guarantorFatherName: optStr(fd.get("guarantorFatherName")),
      guarantorNationalId: optStr(fd.get("guarantorNationalId")), guarantorTin: optStr(fd.get("guarantorTin")), guarantorPhone: optStr(fd.get("guarantorPhone")),
      guarantorProvince: optStr(fd.get("guarantorProvince")), guarantorDistrict: optStr(fd.get("guarantorDistrict")), guarantorArea: optStr(fd.get("guarantorArea")), guarantorVillage: optStr(fd.get("guarantorVillage")),
      businessName: optStr(fd.get("businessName")), businessType: optStr(fd.get("businessType")), businessLicenseNumber: optStr(fd.get("businessLicenseNumber")),
      businessLicenseExpiry: optStr(fd.get("businessLicenseExpiry")), businessIssuingAuthority: optStr(fd.get("businessIssuingAuthority")), businessPhone: optStr(fd.get("businessPhone")), businessEmail: optStr(fd.get("businessEmail")), businessAddress: optStr(fd.get("businessAddress")),
      guaranteeType: str(fd.get("guaranteeType")) || "shareholder", startDate: optStr(fd.get("startDate")), endDate: optStr(fd.get("endDate")),
      status: str(fd.get("status")) || "active", notes: optStr(fd.get("notes")), createdBy: ctx.user.id, updatedAt: new Date(),
    };
    if (!data.guarantorName) throw new FinanceError("invalid_input");
    await requireCustomer(db, customerId, ctx.org.id);
    if (data.beneficiaryShareholderId) {
      const [shareholder] = await db.select({ id: customerShareholders.id }).from(customerShareholders).where(and(
        eq(customerShareholders.id, data.beneficiaryShareholderId),
        eq(customerShareholders.organizationId, ctx.org.id),
        eq(customerShareholders.customerId, customerId),
      ));
      if (!shareholder) throw new FinanceError("not_found");
    }
    if (id) { await db.update(customerGuarantees).set(data).where(and(eq(customerGuarantees.id,id),eq(customerGuarantees.organizationId,ctx.org.id),eq(customerGuarantees.customerId,customerId))); return {id}; }
    const [row] = await db.insert(customerGuarantees).values(data).returning(); return {id:row.id};
  });
}
