"use server";
import { and, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { attachments, caseFiles, caseNotes, caseWorkflowPayments, caseWorkflowSteps, cases, complianceEvents, contracts, customers, documentFiles, documentRevisions, documents, generatedForms, incomes, organizationMembers, profiles, serviceFeeReceipts, services, taxSettlementPayments, taxSettlements, letters } from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { audit, FinanceError, nextNumber } from "@/lib/finance";
import { num, optStr, str } from "@/lib/format";
import { act } from "./util";
import { normalizeDateInput, parseCaseOpeningDate } from "@/lib/jalali";
import { formFile, readDocumentUpload, readLogoUpload } from "@/lib/upload";

/* ---------------- Customers ---------------- */
export async function saveCustomer(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("customers.write");
    const id = optStr(fd.get("id"));
    const logoFile = formFile(fd.get("logoFile"));
    const logoBytes = await readLogoUpload(logoFile);
    const data = {
      name: str(fd.get("name")),
      englishName: optStr(fd.get("englishName")),
      tradeName: optStr(fd.get("tradeName")),
      tradeNameEn: optStr(fd.get("tradeNameEn")),
      fatherName: optStr(fd.get("fatherName")),
      phone: optStr(fd.get("phone")),
      email: optStr(fd.get("email")),
      address: optStr(fd.get("address")),
      nationalId: optStr(fd.get("nationalId")),
      customerType: str(fd.get("customerType")) || "individual",
      tin: optStr(fd.get("tin")),
      licenseNumber: optStr(fd.get("licenseNumber")),
      activity: optStr(fd.get("activity")),
      province: optStr(fd.get("province")),
      district: optStr(fd.get("district")),
      area: optStr(fd.get("area")),
      market: optStr(fd.get("market")),
      floor: optStr(fd.get("floor")),
      shopNumber: optStr(fd.get("shopNumber")),
      notes: optStr(fd.get("notes")),
      status: str(fd.get("status")) || "active",
    };
    if (!data.name) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      let logoAttachmentId: string | null = null;
      if (logoFile instanceof File && logoBytes) {
        const [att] = await tx.insert(attachments).values({
          organizationId: ctx.org.id,
          fileName: logoFile.name,
          mimeType: logoFile.type,
          fileSize: logoFile.size,
          content: logoBytes.toString("base64"),
          uploadedBy: ctx.user.id,
        }).returning();
        logoAttachmentId = att.id;
      }
      if (id) {
        const [old] = await tx.select().from(customers).where(and(eq(customers.id, id), eq(customers.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        const code = optStr(fd.get("customerCode")) ?? old.customerCode;
        await tx.update(customers).set({ ...data, customerCode: code, logoAttachmentId: logoAttachmentId ?? old.logoAttachmentId, updatedAt: new Date() }).where(eq(customers.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "customer", entityId: id, oldData: old, newData: { ...data, logoUpdated: Boolean(logoAttachmentId) } });
        return { id };
      }
      const code = optStr(fd.get("customerCode")) ?? (await nextNumber(tx, ctx.org.id, "customer"));
      const [row] = await tx.insert(customers).values({ ...data, customerCode: code, organizationId: ctx.org.id, logoAttachmentId, isDemo: ctx.org.isDemo }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "customer", entityId: row.id, newData: { ...row, logoUpdated: Boolean(logoAttachmentId) } });
      return { id: row.id };
    });
  });
}

export async function deleteCustomer(id: string) {
  return act(async () => {
    const ctx = await requireContext("customers.delete");
    await db.transaction(async (tx) => {
      const [old] = await tx.select().from(customers).where(and(eq(customers.id, id), eq(customers.organizationId, ctx.org.id)));
      if (!old) throw new FinanceError("not_found");
      // Preserve accounting, ledger and tax history: the destructive delete button performs an audited archive.
      await tx.update(customers).set({ status: "archived", updatedAt: new Date() }).where(eq(customers.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "customer", entityId: id, oldData: old, newData: { status: "archived", archivedInsteadOfHardDelete: true } });
    });
  });
}

/* ---------------- Services ---------------- */
export async function saveService(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("services.write");
    const id = optStr(fd.get("id"));
    const name = str(fd.get("name"));
    const description = optStr(fd.get("description"));
    const listFrom = (key: string) => str(fd.get(key)).split(/\\r?\\n/).map((x) => x.trim()).filter(Boolean);
    const data = {
      name,
      category: optStr(fd.get("category")),
      description,
      defaultPrice: num(fd.get("defaultPrice")),
      taxTypeId: optStr(fd.get("taxTypeId")),
      publicListed: fd.get("publicListed") === "on",
      publicOrder: Math.max(0, Math.round(num(fd.get("publicOrder")))),
      estimatedDays: optStr(fd.get("estimatedDays")) ? Math.max(0, Math.round(num(fd.get("estimatedDays")))) : null,
      feeQuoteRequired: fd.get("feeQuoteRequired") === "on",
      publicContent: {
        title: { fa: name, ps: optStr(fd.get("namePs")) ?? name, en: optStr(fd.get("nameEn")) ?? name },
        description: { fa: description ?? "", ps: optStr(fd.get("descriptionPs")) ?? description ?? "", en: optStr(fd.get("descriptionEn")) ?? description ?? "" },
        requirements: { fa: listFrom("requirementsFa"), ps: listFrom("requirementsPs"), en: listFrom("requirementsEn") },
        workflow: { fa: listFrom("stepsFa"), ps: listFrom("stepsPs"), en: listFrom("stepsEn") },
        feeText: { fa: "پس از بررسی دوسیه تعیین می‌شود", ps: "دوسیه تر ارزونې وروسته ټاکل کېږي", en: "Quoted after case review" },
      },
      requiredDocuments: { fa: listFrom("requirementsFa"), ps: listFrom("requirementsPs"), en: listFrom("requirementsEn") },
      workflowSteps: { fa: listFrom("stepsFa"), ps: listFrom("stepsPs"), en: listFrom("stepsEn") },
      status: str(fd.get("status")) || "active",
    };
    if (!data.name || data.defaultPrice < 0 || (data.estimatedDays !== null && data.estimatedDays < 0)) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      if (id) {
        const [old] = await tx.select().from(services).where(and(eq(services.id, id), eq(services.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        await tx.update(services).set(data).where(eq(services.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "service", entityId: id, oldData: old, newData: data });
        return { id };
      }
      const [row] = await tx.insert(services).values({ ...data, organizationId: ctx.org.id, isDemo: ctx.org.isDemo }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "service", entityId: row.id, newData: row });
      return { id: row.id };
    });
  });
}

export async function deleteService(id: string) {
  return act(async () => {
    const ctx = await requireContext("services.delete");
    await db.transaction(async (tx) => {
      const [old] = await tx.select().from(services).where(and(eq(services.id, id), eq(services.organizationId, ctx.org.id)));
      if (!old) throw new FinanceError("not_found");
      await tx.update(services).set({ status: "archived" }).where(eq(services.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "service", entityId: id, oldData: old, newData: { status: "archived", archivedInsteadOfHardDelete: true } });
    });
  });
}

/* ---------------- Internal service cases ---------------- */
export async function saveCase(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    const id = optStr(fd.get("id"));
    const customerId = str(fd.get("customerId"));
    const serviceId = str(fd.get("serviceId"));
    const responsibleEmployeeId = optStr(fd.get("responsibleEmployeeId"));
    const rawOpenedAt = normalizeDateInput(fd.get("openedAt"));
    const openedAt = parseCaseOpeningDate(rawOpenedAt);
    const priorityValue = str(fd.get("priority"));
    const priority = ["normal", "high", "urgent"].includes(priorityValue)
      ? priorityValue
      : "normal";

    if (!customerId) throw new FinanceError("customer_not_found");
    if (!serviceId) throw new FinanceError("invalid_case_service");
    if (!openedAt) throw new FinanceError("invalid_case_date");

    const rawFee = str(fd.get("serviceFee"));
    const rawDiscount = str(fd.get("discountAmount"));
    const fee = rawFee === "" ? null : Number(rawFee.replace(/,/g, ""));
    const discount = rawDiscount === "" ? 0 : Number(rawDiscount.replace(/,/g, ""));

    if (fee !== null && !Number.isFinite(fee)) {
      throw new FinanceError("invalid_case_fee");
    }
    if (!Number.isFinite(discount) || discount < 0) {
      throw new FinanceError("invalid_case_discount");
    }

    return db.transaction(async (tx) => {
      const [customer] = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.org.id)));

      if (!customer) throw new FinanceError("customer_not_found");

      let service: typeof services.$inferSelect | undefined;

      if (serviceId) {
        const [s] = await tx
          .select()
          .from(services)
          .where(and(eq(services.id, serviceId), eq(services.organizationId, ctx.org.id)));

        if (!s) throw new FinanceError("invalid_case_service");
        service = s;
      }

      if (responsibleEmployeeId) {
        const [member] = await tx
          .select({ id: organizationMembers.id })
          .from(organizationMembers)
          .innerJoin(profiles, eq(organizationMembers.userId, profiles.id))
          .where(
            and(
              eq(organizationMembers.organizationId, ctx.org.id),
              eq(organizationMembers.userId, responsibleEmployeeId),
              eq(organizationMembers.status, "active"),
            ),
          );

        if (!member) throw new FinanceError("invalid_case_employee");
      }

      const finalFee = fee === null ? Number(service?.defaultPrice ?? 0) : fee;

      if (!Number.isFinite(finalFee) || finalFee < 0) {
        throw new FinanceError("invalid_case_fee");
      }
      if (discount > finalFee) {
        throw new FinanceError("invalid_case_discount");
      }

      const data = {
        customerId,
        serviceId,
        responsibleEmployeeId,
        priority,
        openedAt,
        serviceFee: finalFee,
        discountAmount: discount,
        feeCurrency: ctx.org.currency,
        notes: optStr(fd.get("notes")),
      };

      if (id) {
        const [old] = await tx
          .select()
          .from(cases)
          .where(and(eq(cases.id, id), eq(cases.organizationId, ctx.org.id)))
          .for("update");

        if (!old) throw new FinanceError("not_found");

        if (
          old.feeStatus !== "unbilled" &&
          (finalFee !== Number(old.serviceFee) || discount !== Number(old.discountAmount))
        ) {
          throw new FinanceError("cannot_edit_final");
        }

        await tx.update(cases).set({ ...data, updatedAt: new Date() }).where(eq(cases.id, id));

        await audit(tx, {
          orgId: ctx.org.id,
          userId: ctx.user.id,
          action: "UPDATE",
          entityType: "case",
          entityId: id,
          oldData: old,
          newData: data,
        });

        return { id };
      }

      const workflowCatalog = (service?.workflowSteps ?? {}) as Record<string, unknown>;
      const workflowSteps = workflowCatalog.fa ?? workflowCatalog.en ?? [];
      const titles = Array.isArray(workflowSteps) ? workflowSteps.filter((x): x is string => typeof x === "string") : [];

      const [row] = await tx
        .insert(cases)
        .values({
          ...data,
          organizationId: ctx.org.id,
          caseNumber: await nextNumber(tx, ctx.org.id, "case"),
          status: "new",
          feeStatus: "unbilled",
          workflowKey: service?.workflowKey ?? null,
          currentStepNo: 1,
          nextAction: titles[0] ?? null,
          createdBy: ctx.user.id,
          isDemo: ctx.org.isDemo,
        })
        .returning();

      if (titles.length > 0) {
        await tx.insert(caseWorkflowSteps).values(
          titles.map((title, index) => ({
            organizationId: ctx.org.id,
            caseId: row.id,
            stepNo: index + 1,
            stepKey: (service?.workflowKey ?? "case") + "_" + (index + 1),
            title,
            status: index === 0 ? "active" : "pending",
            actionRequired: title,
            paidAmount: 0,
            remainingAmount: 0,
          })),
        );
      }

      if (data.notes) {
        await tx.insert(caseNotes).values({
          organizationId: ctx.org.id,
          caseId: row.id,
          body: data.notes,
          visibility: "internal",
          createdBy: ctx.user.id,
        });
      }

      await audit(tx, {
        orgId: ctx.org.id,
        userId: ctx.user.id,
        action: "CREATE",
        entityType: "case",
        entityId: row.id,
        newData: row,
      });

      return { id: row.id };
    });
  });
}
const CASE_TRANSITIONS: Record<string, { from: string[]; to: string; approve?: boolean }> = {
  review: { from: ["new"], to: "reviewing" },
  missing: { from: ["reviewing", "in_progress", "awaiting_review"], to: "missing_documents" },
  progress: { from: ["reviewing", "missing_documents", "awaiting_review", "awaiting_approval"], to: "in_progress" },
  awaiting_review: { from: ["in_progress"], to: "awaiting_review" },
  request_approval: { from: ["awaiting_review"], to: "awaiting_approval" },
  ready: { from: ["awaiting_approval", "awaiting_review"], to: "ready_for_delivery", approve: true },
  deliver: { from: ["ready_for_delivery"], to: "delivered", approve: true },
  close: { from: ["delivered"], to: "closed", approve: true },
  cancel: { from: ["new", "reviewing", "missing_documents", "in_progress", "awaiting_review", "awaiting_approval", "ready_for_delivery"], to: "cancelled" },
};

export async function transitionCase(id: string, action: string) {
  return act(async () => {
    const tr = CASE_TRANSITIONS[action];
    if (!tr) throw new FinanceError("invalid_transition");
    const ctx = await requireContext(tr.approve ? "cases.approve" : "cases.write");
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(cases).where(and(eq(cases.id, id), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!row) throw new FinanceError("not_found");
      if (!tr.from.includes(row.status)) throw new FinanceError("invalid_transition");

      if (tr.to === "ready_for_delivery") {
        const steps = await tx.select({ id: caseWorkflowSteps.id, status: caseWorkflowSteps.status, stepNo: caseWorkflowSteps.stepNo })
          .from(caseWorkflowSteps)
          .where(and(eq(caseWorkflowSteps.caseId, id), eq(caseWorkflowSteps.organizationId, ctx.org.id)))
          .orderBy(caseWorkflowSteps.stepNo)
          .for("update");

        const incomplete = steps.find((s) => s.status !== "completed");
        if (incomplete) {
          if (row.workflowKey === "tax-settlement" && incomplete.stepNo === 5) {
            const settlements = await tx.select({ id: taxSettlements.id, status: taxSettlements.status, remainingAmount: taxSettlements.remainingAmount })
              .from(taxSettlements)
              .where(and(eq(taxSettlements.caseId, id), eq(taxSettlements.organizationId, ctx.org.id)))
              .for("update");
            if (settlements.length === 0) throw new FinanceError("tax_settlement_required");
            if (settlements.length > 1) throw new FinanceError("tax_settlement_ambiguous");
            const settlement = settlements[0];
            if (settlement.status === "calculated" || settlement.status === "REQUIRES_LEGAL_REVIEW") throw new FinanceError("legal_review_required");
            if (Number(settlement.remainingAmount ?? 0) > 0) throw new FinanceError("workflow_payment_required");
          }
          throw new FinanceError("case_task_incomplete");
        }
      }

      await tx.update(cases).set({ status: tr.to, closedAt: tr.to === "closed" ? new Date().toISOString().slice(0, 10) : row.closedAt, updatedAt: new Date() }).where(eq(cases.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: tr.approve ? "APPROVE" : tr.to === "cancelled" ? "CANCEL" : "UPDATE", entityType: "case", entityId: id, oldData: { status: row.status }, newData: { status: tr.to } });
    });
  });
}

export async function completeCaseWorkflowStepAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    await db.transaction(async (tx) => {
      const [step] = await tx.select().from(caseWorkflowSteps)
        .where(and(eq(caseWorkflowSteps.id, id), eq(caseWorkflowSteps.organizationId, ctx.org.id))).for("update");
      if (!step) throw new FinanceError("not_found");
      if (step.status !== "active") throw new FinanceError("invalid_transition");

      const [row] = await tx.select().from(cases)
        .where(and(eq(cases.id, step.caseId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!row) throw new FinanceError("not_found");

      if (row.workflowKey === "tax-settlement" && step.stepNo === 5) {
        const settlements = await tx.select({
          id: taxSettlements.id, taxAmount: taxSettlements.taxAmount,
          paidAmount: taxSettlements.paidAmount, remainingAmount: taxSettlements.remainingAmount,
        }).from(taxSettlements)
          .where(and(eq(taxSettlements.caseId, row.id), eq(taxSettlements.organizationId, ctx.org.id))).for("update");
        if (settlements.length === 0) throw new FinanceError("tax_settlement_required");
        if (settlements.length > 1) throw new FinanceError("tax_settlement_ambiguous");
        const settlement = settlements[0];
        if (Number(settlement.remainingAmount ?? 0) > 0) throw new FinanceError("workflow_payment_required");
        await tx.update(caseWorkflowSteps).set({
          amount: Number(settlement.taxAmount ?? 0),
          paidAmount: Number(settlement.paidAmount ?? 0),
          remainingAmount: Math.max(0, Number(settlement.remainingAmount ?? 0)),
          updatedAt: new Date(),
        }).where(eq(caseWorkflowSteps.id, step.id));
      } else if (Number(step.amount ?? 0) > 0 && Number(step.paidAmount ?? 0) < Number(step.amount ?? 0)) {
        throw new FinanceError("workflow_payment_required");
      }

      const [next] = await tx.select().from(caseWorkflowSteps)
        .where(and(eq(caseWorkflowSteps.caseId, row.id), eq(caseWorkflowSteps.organizationId, ctx.org.id), eq(caseWorkflowSteps.stepNo, step.stepNo + 1)));

      await tx.update(caseWorkflowSteps).set({
        status: "completed", completedAt: new Date(), completedBy: ctx.user.id, updatedAt: new Date(),
      }).where(eq(caseWorkflowSteps.id, step.id));

      if (next) {
        await tx.update(caseWorkflowSteps).set({ status: "active", updatedAt: new Date() }).where(eq(caseWorkflowSteps.id, next.id));
        await tx.update(cases).set({
          status: row.status === "new" ? "in_progress" : row.status,
          currentStepNo: next.stepNo, nextAction: next.actionRequired ?? next.title,
          targetDate: next.dueDate, updatedAt: new Date(),
        }).where(eq(cases.id, row.id));
      } else {
        await tx.update(cases).set({
          status: "ready_for_delivery", currentStepNo: step.stepNo, nextAction: null,
          targetDate: null, completedAt: new Date(), updatedAt: new Date(),
        }).where(eq(cases.id, row.id));
      }

      await audit(tx, {
        orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE",
        entityType: "case_workflow_step", entityId: step.id,
        oldData: { status: step.status, caseId: step.caseId, stepNo: step.stepNo },
        newData: { status: "completed", nextStepNo: next?.stepNo ?? null },
      });
    });
  });
}

export async function recordCaseWorkflowPaymentAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    const stepId = str(fd.get("stepId"));
    const amount = Number(str(fd.get("amount")).replace(/,/g, ""));
    const paymentDate = str(fd.get("paymentDate")) || new Date().toISOString().slice(0, 10);
    const paymentMethod = optStr(fd.get("paymentMethod"));
    const referenceNumber = optStr(fd.get("referenceNumber"));
    const notes = optStr(fd.get("notes"));
    if (!stepId || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      throw new FinanceError("invalid_workflow_payment");
    }

    return db.transaction(async (tx) => {
      const [step] = await tx.select().from(caseWorkflowSteps)
        .where(and(eq(caseWorkflowSteps.id, stepId), eq(caseWorkflowSteps.organizationId, ctx.org.id))).for("update");
      if (!step) throw new FinanceError("not_found");
      if (step.status !== "active") throw new FinanceError("invalid_transition");

      const [row] = await tx.select().from(cases)
        .where(and(eq(cases.id, step.caseId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!row) throw new FinanceError("not_found");

      let due = Number(step.amount ?? 0);
      let paid = Number(step.paidAmount ?? 0);
      let settlementId: string | null = null;

      if (row.workflowKey === "tax-settlement" && step.stepNo === 5) {
        const settlements = await tx.select({
          id: taxSettlements.id, taxAmount: taxSettlements.taxAmount, status: taxSettlements.status,
        }).from(taxSettlements)
          .where(and(eq(taxSettlements.caseId, row.id), eq(taxSettlements.organizationId, ctx.org.id))).for("update");
        if (settlements.length === 0) throw new FinanceError("tax_settlement_required");
        if (settlements.length > 1) throw new FinanceError("tax_settlement_ambiguous");

        settlementId = settlements[0].id;
        if (!["approved", "part_paid"].includes(settlements[0].status)) {
          throw new FinanceError(settlements[0].status === "calculated" ? "approval_required" : "legal_review_required");
        }
        due = Number(settlements[0].taxAmount ?? 0);

        const [paidRow] = await tx.select({ paid: sum(taxSettlementPayments.amount) })
          .from(taxSettlementPayments)
          .where(and(eq(taxSettlementPayments.organizationId, ctx.org.id), eq(taxSettlementPayments.settlementId, settlementId)));
        paid = Number(paidRow?.paid ?? 0);
      }

      if (due <= 0 || paid + amount > due) throw new FinanceError("amount_exceeds_due");

      const [payment] = await tx.insert(caseWorkflowPayments).values({
        organizationId: ctx.org.id, caseId: step.caseId, workflowStepId: step.id,
        amount, currency: ctx.org.currency, paymentDate, paymentMethod,
        referenceNumber, notes, recordedBy: ctx.user.id,
      }).returning();

      const newPaid = paid + amount;
      const remaining = Math.max(0, due - newPaid);

      if (settlementId) {
        const [taxPayment] = await tx.insert(taxSettlementPayments).values({
          organizationId: ctx.org.id, settlementId, amount, currency: ctx.org.currency,
          paymentDate, officialReceiptNumber: referenceNumber, notes, recordedBy: ctx.user.id,
        }).returning();

        const [updatedSettlement] = await tx.update(taxSettlements).set({
          paidAmount: newPaid, remainingAmount: remaining, updatedAt: new Date(),
        }).where(and(eq(taxSettlements.id, settlementId), eq(taxSettlements.organizationId, ctx.org.id))).returning();
        if (!updatedSettlement) throw new FinanceError("not_found");

        await audit(tx, {
          orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE",
          entityType: "tax_settlement_payment", entityId: taxPayment.id,
          newData: { settlementId, caseId: step.caseId, amount, paidAmount: newPaid, remainingAmount: remaining },
        });
      }

      await tx.update(caseWorkflowSteps).set({
        amount: due, paidAmount: newPaid, remainingAmount: remaining, updatedAt: new Date(),
      }).where(eq(caseWorkflowSteps.id, step.id));

      await audit(tx, {
        orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE",
        entityType: "case_workflow_payment", entityId: payment.id,
        newData: {
          stepId: step.id, caseId: step.caseId, amount, paidAmount: newPaid,
          remainingAmount: remaining, source: settlementId ? "tax_settlement" : "workflow", settlementId,
        },
      });
      return { id: payment.id, settlementId };
    });
  });
}

export async function updateCaseWorkflowStepAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    const id = str(fd.get("id"));
    const dueDate = optStr(fd.get("dueDate"));
    const amountRaw = str(fd.get("amount"));
    const amount = amountRaw === "" ? null : Number(amountRaw.replace(/,/g, ""));
    const actionRequired = optStr(fd.get("actionRequired"));
    const notes = optStr(fd.get("notes"));
    if (!id || (amount !== null && (!Number.isFinite(amount) || amount < 0))) throw new FinanceError("invalid_input");

    await db.transaction(async (tx) => {
      const [step] = await tx.select().from(caseWorkflowSteps)
        .where(and(eq(caseWorkflowSteps.id, id), eq(caseWorkflowSteps.organizationId, ctx.org.id)))
        .for("update");
      if (!step) throw new FinanceError("not_found");

      const [row] = await tx.select({ id: cases.id }).from(cases)
        .where(and(eq(cases.id, step.caseId), eq(cases.organizationId, ctx.org.id)));
      if (!row) throw new FinanceError("not_found");

      await tx.update(caseWorkflowSteps).set({
        dueDate,
        ...(amount === null ? {} : { amount }),
        actionRequired,
        notes,
        updatedAt: new Date(),
      }).where(eq(caseWorkflowSteps.id, id));

      if (step.status === "active") {
        await tx.update(cases).set({
          targetDate: dueDate,
          nextAction: actionRequired || step.title,
          updatedAt: new Date(),
        }).where(eq(cases.id, row.id));
      }

      await audit(tx, {
        orgId: ctx.org.id,
        userId: ctx.user.id,
        action: "UPDATE",
        entityType: "case_workflow_step",
        entityId: id,
        oldData: { dueDate: step.dueDate, amount: step.amount, actionRequired: step.actionRequired },
        newData: { dueDate, amount, actionRequired, notes },
      });
    });
  });
}

export async function deleteUnlinkedCaseAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("cases.delete");
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(cases).where(and(eq(cases.id, id), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!row) throw new FinanceError("not_found");
      const linked = await Promise.all([
        tx.select({ id: documents.id }).from(documents).where(and(eq(documents.caseId, id), eq(documents.organizationId, ctx.org.id))).limit(1),
        tx.select({ id: incomes.id }).from(incomes).where(and(eq(incomes.caseId, id), eq(incomes.organizationId, ctx.org.id))).limit(1),
        tx.select({ id: serviceFeeReceipts.id }).from(serviceFeeReceipts).where(and(eq(serviceFeeReceipts.caseId, id), eq(serviceFeeReceipts.organizationId, ctx.org.id))).limit(1),
        tx.select({ id: taxSettlements.id }).from(taxSettlements).where(and(eq(taxSettlements.caseId, id), eq(taxSettlements.organizationId, ctx.org.id))).limit(1),
        tx.select({ id: complianceEvents.id }).from(complianceEvents).where(and(eq(complianceEvents.caseId, id), eq(complianceEvents.organizationId, ctx.org.id))).limit(1),
        tx.select({ id: generatedForms.id }).from(generatedForms).where(and(eq(generatedForms.caseId, id), eq(generatedForms.organizationId, ctx.org.id))).limit(1),
        tx.select({ id: letters.id }).from(letters).where(and(eq(letters.caseId, id), eq(letters.organizationId, ctx.org.id))).limit(1),
        tx.select({ id: caseFiles.id }).from(caseFiles).where(and(eq(caseFiles.caseId, id), eq(caseFiles.organizationId, ctx.org.id))).limit(1),
      ]);
      if (linked.some((x) => x.length > 0) || !["new", "cancelled"].includes(row.status)) throw new FinanceError("case_has_history");
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "case", entityId: row.id, oldData: row });
      await tx.delete(cases).where(eq(cases.id, id));
    });
  });
}

export async function addCaseNote(id: string, body: string) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    const note = body.trim();
    if (!note) throw new FinanceError("invalid_input");
    await db.transaction(async (tx) => {
      const [row] = await tx.select({ id: cases.id }).from(cases).where(and(eq(cases.id, id), eq(cases.organizationId, ctx.org.id)));
      if (!row) throw new FinanceError("not_found");
      const [n] = await tx.insert(caseNotes).values({ organizationId: ctx.org.id, caseId: id, body: note, visibility: "internal", createdBy: ctx.user.id }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "case_note", entityId: n.id, newData: { caseId: id } });
    });
  });
}

export async function addCaseNoteForm(fd: FormData) {
  return addCaseNote(str(fd.get("caseId")), str(fd.get("body")));
}

export async function uploadCaseFile(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    const caseId = str(fd.get("caseId"));
    const file = formFile(fd.get("file"));
    if (!file) throw new FinanceError("invalid_input");
    const bytes = await readDocumentUpload(file);
    if (!bytes) throw new FinanceError("invalid_input");
    const { createHash } = await import("crypto");
    const checksum = createHash("sha256").update(bytes).digest("hex");
    await db.transaction(async (tx) => {
      const [row] = await tx.select({ id: cases.id }).from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id)));
      if (!row) throw new FinanceError("not_found");
      const [f] = await tx.insert(attachments).values({ organizationId: ctx.org.id, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, content: bytes.toString("base64"), uploadedBy: ctx.user.id }).returning();
      const [link] = await tx.insert(caseFiles).values({ organizationId: ctx.org.id, caseId, attachmentId: f.id, uploadedBy: ctx.user.id }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPLOAD", entityType: "case_file", entityId: link.id, newData: { fileName: file.name, fileSize: file.size, sha256: checksum } });
    });
  });
}

/* ---------------- Documents ---------------- */
const FINAL_DOC_STATUSES = ["approved", "completed", "archived"];

export async function saveDocument(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("documents.write");
    const id = optStr(fd.get("id"));
    const data = {
      title: str(fd.get("title")),
      documentType: str(fd.get("documentType")) || "letter",
      customerId: optStr(fd.get("customerId")),
      caseId: optStr(fd.get("caseId")),
      officialNumber: optStr(fd.get("officialNumber")),
      legalReference: optStr(fd.get("legalReference")),
      description: optStr(fd.get("description")),
      documentDate: str(fd.get("documentDate")),
    };
    if (!data.title || !data.documentDate) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      if (data.caseId) {
        const [linkedCase] = await tx.select({ customerId: cases.customerId }).from(cases).where(and(eq(cases.id, data.caseId), eq(cases.organizationId, ctx.org.id)));
        if (!linkedCase || (data.customerId && data.customerId !== linkedCase.customerId)) throw new FinanceError("invalid_input");
        data.customerId = linkedCase.customerId;
      }
      if (id) {
        const [old] = await tx.select().from(documents).where(and(eq(documents.id, id), eq(documents.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        if (FINAL_DOC_STATUSES.includes(old.status)) {
          // Finalized documents are never silently modified: an amendment revision is required.
          if (!ctx.can("documents.approve")) throw new FinanceError("cannot_edit_final");
          const reason = optStr(fd.get("reason"));
          if (!reason) throw new FinanceError("invalid_input");
          const changes: Record<string, { from: unknown; to: unknown }> = {};
          for (const k of Object.keys(data) as (keyof typeof data)[]) if ((old[k] ?? null) !== (data[k] ?? null)) changes[k] = { from: old[k], to: data[k] };
          const revision = old.revision + 1;
          await tx.insert(documentRevisions).values({ organizationId: ctx.org.id, documentId: id, revision, snapshot: old, changes, reason, createdBy: ctx.user.id });
          await tx.update(documents).set({ ...data, revision, updatedAt: new Date() }).where(eq(documents.id, id));
          await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "AMEND", entityType: "document", entityId: id, oldData: old, newData: { ...data, revision, reason } });
          return { id };
        }
        await tx.update(documents).set({ ...data, updatedAt: new Date() }).where(eq(documents.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "document", entityId: id, oldData: old, newData: data });
        return { id };
      }
      const number = optStr(fd.get("documentNumber")) ?? (await nextNumber(tx, ctx.org.id, "document"));
      const [row] = await tx.insert(documents).values({ ...data, documentNumber: number, organizationId: ctx.org.id, createdBy: ctx.user.id, status: "draft", isDemo: ctx.org.isDemo }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "document", entityId: row.id, newData: row });
      return { id: row.id };
    });
  });
}

const TRANSITIONS: Record<string, { from: string[]; to: string; perm: "documents.write" | "documents.approve"; log: string }> = {
  submit: { from: ["draft", "rejected"], to: "submitted", perm: "documents.write", log: "SUBMIT" },
  review: { from: ["submitted"], to: "under_review", perm: "documents.approve", log: "REVIEW" },
  approve: { from: ["under_review", "submitted"], to: "approved", perm: "documents.approve", log: "APPROVE" },
  reject: { from: ["under_review", "submitted"], to: "rejected", perm: "documents.approve", log: "REJECT" },
  complete: { from: ["approved"], to: "completed", perm: "documents.write", log: "COMPLETE" },
  archive: { from: ["completed", "rejected", "cancelled"], to: "archived", perm: "documents.write", log: "ARCHIVE" },
  cancel: { from: ["draft", "submitted"], to: "cancelled", perm: "documents.write", log: "CANCEL" },
};

export async function transitionDocument(id: string, action: string, reason?: string | null) {
  return act(async () => {
    const tr = TRANSITIONS[action];
    if (!tr) throw new FinanceError("invalid_transition");
    const ctx = await requireContext(tr.perm);
    await db.transaction(async (tx) => {
      const [doc] = await tx.select().from(documents).where(and(eq(documents.id, id), eq(documents.organizationId, ctx.org.id))).for("update");
      if (!doc) throw new FinanceError("not_found");
      if (!tr.from.includes(doc.status)) throw new FinanceError("invalid_transition");
      const isApproval = tr.to === "approved";
      await tx
        .update(documents)
        .set({
          status: tr.to,
          approvedBy: isApproval ? ctx.user.id : doc.approvedBy,
          approvedAt: isApproval ? new Date() : doc.approvedAt,
          rejectionReason: tr.to === "rejected" ? (reason ?? null) : doc.rejectionReason,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: tr.log, entityType: "document", entityId: id, oldData: { status: doc.status }, newData: { status: tr.to, reason: reason ?? null } });
    });
  });
}

export async function deleteDocument(id: string) {
  return act(async () => {
    const ctx = await requireContext("documents.delete");
    await db.transaction(async (tx) => {
      const [doc] = await tx.select().from(documents).where(and(eq(documents.id, id), eq(documents.organizationId, ctx.org.id)));
      if (!doc) throw new FinanceError("not_found");
      if (FINAL_DOC_STATUSES.includes(doc.status)) throw new FinanceError("cannot_edit_final");
      await tx.delete(documents).where(eq(documents.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "document", entityId: id, oldData: doc });
    });
  });
}

export async function uploadDocumentFile(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("documents.write");
    const documentId = str(fd.get("documentId"));
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) throw new FinanceError("invalid_input");
    if (file.size > 5 * 1024 * 1024) throw new FinanceError("file_too_large");
    const buf = Buffer.from(await file.arrayBuffer());
    await db.transaction(async (tx) => {
      const [doc] = await tx.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.organizationId, ctx.org.id)));
      if (!doc) throw new FinanceError("not_found");
      const [att] = await tx
        .insert(attachments)
        .values({ organizationId: ctx.org.id, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, content: buf.toString("base64"), uploadedBy: ctx.user.id })
        .returning();
      const [df] = await tx
        .insert(documentFiles)
        .values({ organizationId: ctx.org.id, documentId, attachmentId: att.id, fileName: file.name, storagePath: `/api/files/${att.id}`, mimeType: att.mimeType, fileSize: file.size, uploadedBy: ctx.user.id })
        .returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "document_file", entityId: df.id, newData: { documentId, fileName: file.name, size: file.size } });
    });
  });
}

export async function deleteDocumentFile(id: string) {
  return act(async () => {
    const ctx = await requireContext("documents.write");
    await db.transaction(async (tx) => {
      const [f] = await tx.select().from(documentFiles).where(and(eq(documentFiles.id, id), eq(documentFiles.organizationId, ctx.org.id)));
      if (!f) throw new FinanceError("not_found");
      await tx.delete(attachments).where(eq(attachments.id, f.attachmentId));
      await tx.delete(documentFiles).where(eq(documentFiles.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "document_file", entityId: id, oldData: f });
    });
  });
}

/* ---------------- Contracts ---------------- */
export async function saveContract(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("contracts.write");
    const id = optStr(fd.get("id"));
    let customerId = optStr(fd.get("customerId"));
    const caseId = optStr(fd.get("caseId"));
    const data = {
      title: str(fd.get("title")),
      customerId,
      caseId,
      startDate: str(fd.get("startDate")),
      endDate: optStr(fd.get("endDate")),
      amount: num(fd.get("amount")),
      currency: str(fd.get("currency")) || ctx.org.currency,
      status: str(fd.get("status")) || "draft",
      description: optStr(fd.get("description")),
    };
    if (!data.title || !data.startDate || data.amount < 0) throw new FinanceError("invalid_input");
    if (data.endDate && data.endDate < data.startDate) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      if (caseId) {
        const [k] = await tx.select({ customerId: cases.customerId }).from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id)));
        if (k && !data.customerId) data.customerId = k.customerId;
      }
      if (id) {
        const [old] = await tx.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        await tx.update(contracts).set({ ...data, updatedAt: new Date() }).where(eq(contracts.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "contract", entityId: id, oldData: old, newData: data });
        return { id };
      }
      const number = optStr(fd.get("contractNumber")) ?? (await nextNumber(tx, ctx.org.id, "contract"));
      const [row] = await tx.insert(contracts).values({ ...data, contractNumber: number, organizationId: ctx.org.id, createdBy: ctx.user.id, isDemo: ctx.org.isDemo }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "contract", entityId: row.id, newData: row });
      return { id: row.id };
    });
  });
}

export async function deleteContract(id: string) {
  return act(async () => {
    const ctx = await requireContext("contracts.delete");
    await db.transaction(async (tx) => {
      const [old] = await tx.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.organizationId, ctx.org.id)));
      if (!old) throw new FinanceError("not_found");
      await tx.delete(contracts).where(eq(contracts.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "contract", entityId: id, oldData: old });
    });
  });
}
