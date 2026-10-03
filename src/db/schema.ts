import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  date,
  jsonb,
  bigint,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const money = (name: string) =>
  numeric(name, { precision: 18, scale: 2, mode: "number" }).notNull().default(0);
const rate = (name: string) =>
  numeric(name, { precision: 18, scale: 6, mode: "number" }).notNull().default(1);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ---------------- Identity ---------------- */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  language: text("language").notNull().default("fa"),
  activeOrganizationId: uuid("active_organization_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  licenseNumber: text("license_number"),
  taxNumber: text("tax_number"),
  logoUrl: text("logo_url"),
  currency: text("currency").notNull().default("AFN"),
  timezone: text("timezone").notNull().default("Asia/Kabul"),
  fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
  dateFormat: text("date_format").notNull().default("jalali"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id"),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(true),
  createdAt: createdAt(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  description: text("description"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("role_permissions_unique").on(t.roleId, t.permissionId)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").notNull().references(() => roles.id),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("org_members_unique").on(t.organizationId, t.userId)],
);

/* ---------------- Master data ---------------- */

/* ---------------- ZIP-derived customer business records ---------------- */
export const customerLicenses = pgTable("customer_licenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  licenseNumber: text("license_number").notNull(),
  licenseType: text("license_type").notNull(),
  issuingAuthority: text("issuing_authority"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  activity: text("activity"),
  serviceTypes: jsonb("service_types").notNull().default([]),
  requiredCapital: money("required_capital"),
  workingCapital: money("working_capital"),
  guaranteeAmount: money("guarantee_amount"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("customer_licenses_number_unique").on(t.organizationId, t.customerId, t.licenseNumber),
  index("customer_licenses_customer_idx").on(t.organizationId, t.customerId, t.expiryDate),
]);

export const customerShareholders = pgTable("customer_shareholders", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  fatherName: text("father_name"),
  grandfatherName: text("grandfather_name"),
  nationalId: text("national_id"),
  tin: text("tin"),
  phone: text("phone"),
  email: text("email"),
  province: text("province"),
  district: text("district"),
  area: text("area"),
  address: text("address"),
  educationLevel: text("education_level"),
  educationField: text("education_field"),
  workExperienceYears: integer("work_experience_years"),
  ownershipPercentage: numeric("ownership_percentage", { precision: 7, scale: 4, mode: "number" }),
  shareValue: money("share_value"),
  role: text("role"),
  status: text("status").notNull().default("active"),
  photoAttachmentId: uuid("photo_attachment_id").references(() => attachments.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("customer_shareholders_customer_idx").on(t.organizationId, t.customerId, t.status),
  uniqueIndex("customer_shareholders_identity_unique").on(t.organizationId, t.customerId, t.nationalId),
]);

export const customerEmployees = pgTable("customer_employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  fatherName: text("father_name"),
  grandfatherName: text("grandfather_name"),
  nationalId: text("national_id"),
  tin: text("tin"),
  phone: text("phone"),
  email: text("email"),
  position: text("position"),
  department: text("department"),
  educationLevel: text("education_level"),
  educationField: text("education_field"),
  workExperienceYears: integer("work_experience_years"),
  employmentDate: date("employment_date"),
  salary: money("salary"),
  province: text("province"),
  district: text("district"),
  area: text("area"),
  village: text("village"),
  address: text("address"),
  status: text("status").notNull().default("active"),
  photoAttachmentId: uuid("photo_attachment_id").references(() => attachments.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("customer_employees_customer_idx").on(t.organizationId, t.customerId, t.status),
  uniqueIndex("customer_employees_identity_unique").on(t.organizationId, t.customerId, t.nationalId),
]);

export const customerBranches = pgTable("customer_branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  branchNumber: text("branch_number"),
  name: text("name"),
  province: text("province"),
  district: text("district"),
  area: text("area"),
  village: text("village"),
  market: text("market"),
  floor: text("floor"),
  shopNumber: text("shop_number"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  representativeEmployeeId: uuid("representative_employee_id").references(() => customerEmployees.id, { onDelete: "set null" }),
  licenseNumber: text("license_number"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("customer_branches_customer_idx").on(t.organizationId, t.customerId, t.status),
  uniqueIndex("customer_branches_number_unique").on(t.organizationId, t.customerId, t.branchNumber),
]);

export const customerBankAccounts = pgTable("customer_bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  branchNumber: text("branch_number"),
  currency: text("currency").notNull().default("AFN"),
  status: text("status").notNull().default("active"),
  statementAttachmentId: uuid("statement_attachment_id").references(() => attachments.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("customer_bank_accounts_customer_idx").on(t.organizationId, t.customerId, t.status),
  uniqueIndex("customer_bank_accounts_number_unique").on(t.organizationId, t.customerId, t.accountNumber),
]);

export const customerGuarantees = pgTable("customer_guarantees", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  beneficiaryShareholderId: uuid("beneficiary_shareholder_id").references(() => customerShareholders.id, { onDelete: "set null" }),
  guarantorName: text("guarantor_name").notNull(),
  guarantorFatherName: text("guarantor_father_name"),
  guarantorNationalId: text("guarantor_national_id"),
  guarantorTin: text("guarantor_tin"),
  guarantorPhone: text("guarantor_phone"),
  guarantorProvince: text("guarantor_province"),
  guarantorDistrict: text("guarantor_district"),
  guarantorArea: text("guarantor_area"),
  guarantorVillage: text("guarantor_village"),
  businessName: text("business_name"),
  businessType: text("business_type"),
  businessLicenseNumber: text("business_license_number"),
  businessLicenseExpiry: date("business_license_expiry"),
  businessIssuingAuthority: text("business_issuing_authority"),
  businessPhone: text("business_phone"),
  businessEmail: text("business_email"),
  businessAddress: text("business_address"),
  photoAttachmentId: uuid("photo_attachment_id").references(() => attachments.id, { onDelete: "set null" }),
  guaranteeType: text("guarantee_type").notNull().default("shareholder"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("customer_guarantees_customer_idx").on(t.organizationId, t.customerId, t.status),
  index("customer_guarantees_beneficiary_idx").on(t.organizationId, t.beneficiaryShareholderId),
]);


export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerCode: text("customer_code").notNull(),
    name: text("name").notNull(),
    englishName: text("english_name"),
    tradeName: text("trade_name"),
    tradeNameEn: text("trade_name_en"),
    fatherName: text("father_name"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    nationalId: text("national_id"),
    logoAttachmentId: uuid("logo_attachment_id"),
    customerType: text("customer_type").notNull().default("individual"),
    tin: text("tin"),
    licenseNumber: text("license_number"),
    activity: text("activity"),
    market: text("market"),
    floor: text("floor"),
    shopNumber: text("shop_number"),
    province: text("province"),
    district: text("district"),
    area: text("area"),
    notes: text("notes"),
    status: text("status").notNull().default("active"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("customers_code_unique").on(t.organizationId, t.customerCode), index("customers_org_idx").on(t.organizationId)],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    description: text("description"),
    defaultPrice: money("default_price"),
    taxTypeId: uuid("tax_type_id"),
    publicListed: boolean("public_listed").notNull().default(false),
    publicContent: jsonb("public_content").notNull().default({}),
    requiredDocuments: jsonb("required_documents").notNull().default([]),
    workflowSteps: jsonb("workflow_steps").notNull().default([]),
    estimatedDays: integer("estimated_days"),
    publicOrder: integer("public_order").notNull().default(0),
    feeQuoteRequired: boolean("fee_quote_required").notNull().default(true),
    workflowKey: text("workflow_key"),
    status: text("status").notNull().default("active"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("services_org_idx").on(t.organizationId), index("services_org_workflow_key_idx").on(t.organizationId, t.workflowKey)],
);

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    caseNumber: text("case_number").notNull(),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    responsibleEmployeeId: uuid("responsible_employee_id").references(() => profiles.id, { onDelete: "set null" }),
    status: text("status").notNull().default("new"),
    priority: text("priority").notNull().default("normal"),
    openedAt: date("opened_at").notNull(),
    closedAt: date("closed_at"),
    serviceFee: money("service_fee"),
    discountAmount: money("discount_amount"),
    feeCurrency: text("fee_currency").notNull().default("AFN"),
    feeStatus: text("fee_status").notNull().default("unbilled"),
    workflowKey: text("workflow_key"),
    currentStepNo: integer("current_step_no").notNull().default(1),
    nextAction: text("next_action"),
    targetDate: date("target_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("cases_number_unique").on(t.organizationId, t.caseNumber), index("cases_org_status_idx").on(t.organizationId, t.status), index("cases_org_workflow_idx").on(t.organizationId, t.workflowKey, t.currentStepNo)],
);

export const caseWorkflowSteps = pgTable(
  "case_workflow_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
    stepNo: integer("step_no").notNull(),
    stepKey: text("step_key").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("pending"),
    actionRequired: text("action_required"),
    dueDate: date("due_date"),
    amount: money("amount"),
    paidAmount: money("paid_amount"),
    remainingAmount: money("remaining_amount"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by").references(() => profiles.id),
    notes: text("notes"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("case_workflow_steps_case_step_unique").on(t.caseId, t.stepNo),
    index("case_workflow_steps_org_case_idx").on(t.organizationId, t.caseId, t.stepNo),
    index("case_workflow_steps_status_idx").on(t.organizationId, t.status, t.dueDate),
  ],
);

export const caseWorkflowPayments = pgTable("case_workflow_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  workflowStepId: uuid("workflow_step_id").notNull().references(() => caseWorkflowSteps.id, { onDelete: "cascade" }),
  amount: money("amount"),
  currency: text("currency").notNull().default("AFN"),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: text("payment_method"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  recordedBy: uuid("recorded_by").references(() => profiles.id),
  createdAt: createdAt(),
}, (t) => [index("case_workflow_payments_step_idx").on(t.organizationId, t.workflowStepId, t.paymentDate), index("case_workflow_payments_case_idx").on(t.organizationId, t.caseId, t.paymentDate)]);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    documentNumber: text("document_number").notNull(),
    documentType: text("document_type").notNull().default("letter"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    officialNumber: text("official_number"),
    legalReference: text("legal_reference"),
    title: text("title").notNull(),
    description: text("description"),
    documentDate: date("document_date").notNull(),
    expiryDate: date("expiry_date"),
    issuingAuthority: text("issuing_authority"),
    status: text("status").notNull().default("draft"),
    revision: integer("revision").notNull().default(1),
    createdBy: uuid("created_by").references(() => profiles.id),
    approvedBy: uuid("approved_by").references(() => profiles.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("documents_number_unique").on(t.organizationId, t.documentNumber), index("documents_org_status_idx").on(t.organizationId, t.status)],
);

export const documentRevisions = pgTable("document_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  changes: jsonb("changes").notNull(),
  reason: text("reason"),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  content: text("content").notNull(),
  uploadedBy: uuid("uploaded_by"),
  createdAt: createdAt(),
});

export const documentFiles = pgTable("document_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  attachmentId: uuid("attachment_id").notNull().references(() => attachments.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  uploadedBy: uuid("uploaded_by"),
  createdAt: createdAt(),
});

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    contractNumber: text("contract_number").notNull(),
    title: text("title").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    amount: money("amount"),
    currency: text("currency").notNull().default("AFN"),
    status: text("status").notNull().default("draft"),
    description: text("description"),
    createdBy: uuid("created_by"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("contracts_number_unique").on(t.organizationId, t.contractNumber)],
);

/* ---------------- Accounting ---------------- */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    accountCode: text("account_code").notNull(),
    accountName: text("account_name").notNull(),
    accountType: text("account_type").notNull(),
    parentId: uuid("parent_id"),
    systemKey: text("system_key"),
    currency: text("currency").notNull().default("AFN"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("accounts_code_unique").on(t.organizationId, t.accountCode)],
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    entryNumber: text("entry_number").notNull(),
    entryDate: date("entry_date").notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    reversedEntryId: uuid("reversed_entry_id"),
    createdBy: uuid("created_by"),
    postedBy: uuid("posted_by"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("journal_number_unique").on(t.organizationId, t.entryNumber), index("journal_org_date_idx").on(t.organizationId, t.entryDate)],
);

export const journalEntryLines = pgTable(
  "journal_entry_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    journalEntryId: uuid("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").notNull().references(() => accounts.id),
    description: text("description"),
    debit: money("debit"),
    credit: money("credit"),
    currency: text("currency").notNull().default("AFN"),
  },
  (t) => [index("jel_entry_idx").on(t.journalEntryId), index("jel_account_idx").on(t.accountId)],
);

/* ---------------- Income / Expense / Transactions ---------------- */
export const incomes = pgTable(
  "incomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    incomeNumber: text("income_number").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    description: text("description"),
    amount: money("amount"),
    taxTypeId: uuid("tax_type_id"),
    taxRate: rate("tax_rate"),
    taxAmount: money("tax_amount"),
    totalAmount: money("total_amount"),
    currency: text("currency").notNull().default("AFN"),
    exchangeRate: rate("exchange_rate"),
    baseAmount: money("base_amount"),
    baseCurrency: text("base_currency").notNull().default("AFN"),
    paymentMethod: text("payment_method").notNull().default("cash"),
    cashAccountId: uuid("cash_account_id"),
    bankAccountId: uuid("bank_account_id"),
    incomeDate: date("income_date").notNull(),
    status: text("status").notNull().default("draft"),
    journalEntryId: uuid("journal_entry_id"),
    createdBy: uuid("created_by"),
    approvedBy: uuid("approved_by"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("incomes_number_unique").on(t.organizationId, t.incomeNumber), index("incomes_org_date_idx").on(t.organizationId, t.incomeDate)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    expenseNumber: text("expense_number").notNull(),
    category: text("category").notNull().default("administrative"),
    accountId: uuid("account_id"),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    description: text("description"),
    amount: money("amount"),
    taxTypeId: uuid("tax_type_id"),
    taxRate: rate("tax_rate"),
    taxAmount: money("tax_amount"),
    totalAmount: money("total_amount"),
    currency: text("currency").notNull().default("AFN"),
    exchangeRate: rate("exchange_rate"),
    baseAmount: money("base_amount"),
    baseCurrency: text("base_currency").notNull().default("AFN"),
    paymentMethod: text("payment_method").notNull().default("cash"),
    cashAccountId: uuid("cash_account_id"),
    bankAccountId: uuid("bank_account_id"),
    expenseDate: date("expense_date").notNull(),
    status: text("status").notNull().default("draft"),
    journalEntryId: uuid("journal_entry_id"),
    createdBy: uuid("created_by"),
    approvedBy: uuid("approved_by"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("expenses_number_unique").on(t.organizationId, t.expenseNumber), index("expenses_org_date_idx").on(t.organizationId, t.expenseDate)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    transactionNumber: text("transaction_number").notNull(),
    transactionType: text("transaction_type").notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    customerId: uuid("customer_id"),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    cashAccountId: uuid("cash_account_id"),
    bankAccountId: uuid("bank_account_id"),
    journalEntryId: uuid("journal_entry_id"),
    paymentMethod: text("payment_method"),
    direction: text("direction").notNull(),
    amount: money("amount"),
    currency: text("currency").notNull().default("AFN"),
    exchangeRate: rate("exchange_rate"),
    baseAmount: money("base_amount"),
    baseCurrency: text("base_currency").notNull().default("AFN"),
    description: text("description"),
    status: text("status").notNull().default("completed"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("transactions_org_date_idx").on(t.organizationId, t.transactionDate)],
);

/* ---------------- Cash / Bank ---------------- */
export const cashAccounts = pgTable("cash_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("AFN"),
  openingBalance: money("opening_balance"),
  currentBalance: money("current_balance"),
  isActive: boolean("is_active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const cashTransactions = pgTable(
  "cash_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    cashAccountId: uuid("cash_account_id").notNull().references(() => cashAccounts.id, { onDelete: "cascade" }),
    transactionType: text("transaction_type").notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    direction: text("direction").notNull(),
    amount: money("amount"),
    balanceAfter: money("balance_after"),
    description: text("description"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("cash_tx_account_idx").on(t.cashAccountId, t.transactionDate)],
);

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  currency: text("currency").notNull().default("AFN"),
  openingBalance: money("opening_balance"),
  currentBalance: money("current_balance"),
  isActive: boolean("is_active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const bankTransactions = pgTable(
  "bank_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    bankAccountId: uuid("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
    transactionType: text("transaction_type").notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    direction: text("direction").notNull(),
    amount: money("amount"),
    balanceAfter: money("balance_after"),
    description: text("description"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("bank_tx_account_idx").on(t.bankAccountId, t.transactionDate)],
);

/* ---------------- Customer ledger ---------------- */
export const customerAccounts = pgTable(
  "customer_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    currency: text("currency").notNull().default("AFN"),
    openingBalance: money("opening_balance"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("customer_accounts_unique").on(t.organizationId, t.customerId)],
);

export const customerLedger = pgTable(
  "customer_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    description: text("description"),
    debit: money("debit"),
    credit: money("credit"),
    balance: money("balance"),
    currency: text("currency").notNull().default("AFN"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("customer_ledger_idx").on(t.customerId, t.transactionDate)],
);

/* ---------------- Tax ---------------- */
export const taxTypes = pgTable("tax_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  createdAt: createdAt(),
});

export const taxRecords = pgTable(
  "tax_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    referenceType: text("reference_type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    taxTypeId: uuid("tax_type_id").references(() => taxTypes.id, { onDelete: "set null" }),
    taxableAmount: money("taxable_amount"),
    taxRate: rate("tax_rate"),
    taxAmount: money("tax_amount"),
    currency: text("currency").notNull().default("AFN"),
    baseTaxAmount: money("base_tax_amount"),
    recordDate: date("record_date").notNull(),
    status: text("status").notNull().default("recorded"),
    createdAt: createdAt(),
  },
  (t) => [index("tax_records_org_idx").on(t.organizationId, t.recordDate)],
);

/* ---------------- System ---------------- */
export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  currency: text("currency").notNull(),
  rate: rate("rate"),
  effectiveDate: date("effective_date").notNull(),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
});

export const approvalRules = pgTable("approval_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  thresholdAmount: money("threshold_amount"),
  requiredRole: text("required_role").notNull().default("manager"),
  isActive: boolean("is_active").notNull().default(true),
});

export const counters = pgTable(
  "counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    key: text("key").notNull(),
    value: integer("value").notNull().default(0),
  },
  (t) => [uniqueIndex("counters_unique").on(t.organizationId, t.key)],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  reportType: text("report_type").notNull(),
  filters: jsonb("filters").notNull().default({}),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"),
    userId: uuid("user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_org_idx").on(t.organizationId, t.createdAt)],
);

export const systemSettings = pgTable(
  "system_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("settings_unique").on(t.organizationId, t.key)],
);

export const backups = pgTable("backups", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  tableCounts: jsonb("table_counts").notNull(),
  data: jsonb("data").notNull(),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
});

/* ---------------- Public information + operational casework ---------------- */
export const publicSites = pgTable("public_sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().unique().references(() => organizations.id, { onDelete: "cascade" }),
  isPublished: boolean("is_published").notNull().default(true),
  publicRequestsEnabled: boolean("public_requests_enabled").notNull().default(false),
  onlinePaymentsEnabled: boolean("online_payments_enabled").notNull().default(false),
  content: jsonb("content").notNull().default({}),
  updatedBy: uuid("updated_by").references(() => profiles.id),
  updatedAt: updatedAt(),
});

export const caseNotes = pgTable("case_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  visibility: text("visibility").notNull().default("internal"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
});

export const caseFiles = pgTable("case_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  attachmentId: uuid("attachment_id").notNull().references(() => attachments.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id),
  createdAt: createdAt(),
});

export const serviceFeeReceipts = pgTable("service_fee_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  receiptNumber: text("receipt_number").notNull(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id),
  feeTotalSnapshot: money("fee_total_snapshot"),
  paidAmount: money("paid_amount"),
  currency: text("currency").notNull().default("AFN"),
  paymentMethod: text("payment_method").notNull(),
  description: text("description"),
  issuedBy: uuid("issued_by").references(() => profiles.id),
  approvedBy: uuid("approved_by").references(() => profiles.id),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("service_receipt_number_unique").on(t.organizationId, t.receiptNumber), index("service_receipts_case_idx").on(t.caseId, t.createdAt)]);

/* ---------------- Official templates: records are versioned, source-linked and never silently replaced ---------------- */
export const officialForms = pgTable("official_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  formKey: text("form_key").notNull(),
  agency: text("agency").notNull(),
  formName: text("form_name").notNull(),
  formNumber: text("form_number"),
  version: integer("version").notNull().default(1),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  sourceUrl: text("source_url").notNull(),
  originalFileUrl: text("original_file_url"),
  templateAttachmentId: uuid("template_attachment_id").references(() => attachments.id, { onDelete: "set null" }),
  fields: jsonb("fields").notNull().default([]),
  fieldMapping: jsonb("field_mapping").notNull().default({}),
  isOfficial: boolean("is_official").notNull().default(true),
  verificationStatus: text("verification_status").notNull().default("source_listed"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  supersedesId: uuid("supersedes_id"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("official_forms_version_unique").on(t.organizationId, t.formKey, t.version), index("official_forms_org_idx").on(t.organizationId, t.agency)]);

export const generatedForms = pgTable("generated_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  internalNumber: text("internal_number").notNull(),
  officialFormId: uuid("official_form_id").references(() => officialForms.id, { onDelete: "set null" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  formNameSnapshot: text("form_name_snapshot").notNull(),
  agencySnapshot: text("agency_snapshot").notNull(),
  versionSnapshot: integer("version_snapshot").notNull(),
  valuesSnapshot: jsonb("values_snapshot").notNull().default({}),
  mappingSnapshot: jsonb("mapping_snapshot").notNull().default({}),
  matchStatus: text("match_status").notNull().default("LEGAL_REVIEW_REQUIRED"),
  documentType: text("document_type").notNull().default("official_template"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("generated_forms_number_unique").on(t.organizationId, t.internalNumber)]);

/* ---------------- Versioned tax rules and saved calculation snapshots ---------------- */
export const taxRules = pgTable("tax_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  ruleKey: text("rule_key").notNull(),
  ruleName: text("rule_name").notNull(),
  legalName: text("legal_name"),
  articleNumber: text("article_number"),
  taxTypeId: uuid("tax_type_id").references(() => taxTypes.id, { onDelete: "set null" }),
  calculationType: text("calculation_type").notNull().default("percentage"),
  rate: numeric("rate", { precision: 18, scale: 6, mode: "number" }),
  conditions: jsonb("conditions").notNull().default({}),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  version: integer("version").notNull().default(1),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  verificationStatus: text("verification_status").notNull().default("requires_legal_review"),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id),
  supersedesId: uuid("supersedes_id"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("tax_rule_version_unique").on(t.organizationId, t.ruleKey, t.version), index("tax_rules_org_idx").on(t.organizationId, t.taxTypeId, t.effectiveFrom)]);

export const taxSettlements = pgTable("tax_settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  settlementNumber: text("settlement_number").notNull(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  taxTypeId: uuid("tax_type_id").references(() => taxTypes.id, { onDelete: "set null" }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  taxableAmount: money("taxable_amount"),
  allowableExpenses: money("allowable_expenses"),
  exemptions: money("exemptions"),
  deductions: money("deductions"),
  taxRate: numeric("tax_rate", { precision: 18, scale: 6, mode: "number" }),
  taxAmount: numeric("tax_amount", { precision: 18, scale: 2, mode: "number" }),
  paidAmount: money("paid_amount"),
  remainingAmount: numeric("remaining_amount", { precision: 18, scale: 2, mode: "number" }),
  ruleId: uuid("rule_id").references(() => taxRules.id, { onDelete: "set null" }),
  ruleVersion: integer("rule_version"),
  ruleSnapshot: jsonb("rule_snapshot").notNull().default({}),
  legalSource: text("legal_source"),
  status: text("status").notNull().default("REQUIRES_LEGAL_REVIEW"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("settlement_number_unique").on(t.organizationId, t.settlementNumber), index("tax_settlements_customer_idx").on(t.organizationId, t.customerId, t.periodStart)]);

export const taxSettlementPayments = pgTable("tax_settlement_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  settlementId: uuid("settlement_id").notNull().references(() => taxSettlements.id, { onDelete: "cascade" }),
  amount: money("amount"),
  currency: text("currency").notNull().default("AFN"),
  paymentDate: date("payment_date").notNull(),
  officialReceiptNumber: text("official_receipt_number"),
  evidenceAttachmentId: uuid("evidence_attachment_id").references(() => attachments.id, { onDelete: "set null" }),
  notes: text("notes"),
  recordedBy: uuid("recorded_by").references(() => profiles.id),
  createdAt: createdAt(),
});

/* ---------------- Internal letters and AML/KYC working records ---------------- */
export const letters = pgTable("letters", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  internalNumber: text("internal_number").notNull(),
  officialNumber: text("official_number"),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  language: text("language").notNull().default("fa"),
  letterDate: date("letter_date").notNull(),
  recipient: text("recipient").notNull(),
  reference: text("reference"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  attachments: jsonb("attachments").notNull().default([]),
  signerName: text("signer_name"),
  signerTitle: text("signer_title"),
  status: text("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("letter_number_unique").on(t.organizationId, t.internalNumber)]);

export const complianceEvents = pgTable("compliance_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  amount: numeric("amount", { precision: 18, scale: 2, mode: "number" }),
  currency: text("currency"),
  counterparty: text("counterparty"),
  referenceNumber: text("reference_number"),
  supportingFileIds: jsonb("supporting_file_ids").notNull().default([]),
  result: text("result").notNull().default("needs_review"),
  internalReportType: text("internal_report_type").notNull().default("FINORA_INTERNAL_REPORT"),
  notes: text("notes"),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
}, (t) => [index("compliance_org_time_idx").on(t.organizationId, t.eventType, t.occurredAt)]);

export const officialResources = pgTable("official_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  agency: text("agency").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  isOfficialDomain: boolean("is_official_domain").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("official_resources_org_idx").on(t.organizationId, t.agency)]);
