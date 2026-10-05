import { supabase } from '@/lib/supabase';

export const db = {};

export interface PersonnelNode {
  id: string;
  name: string;
  title: string;
  category: 'president' | 'board' | 'operations' | 'compliance' | 'branch' | 'executive';
  key: string;
}

export interface CompanySettings {
  issueDate: string;
  customLogo: string | null;
}

export async function loadOrgChart(companyId = 'default') {
  const owner_user_id = await currentUserId();
  const { data, error } = await supabase.from('org_chart_settings').select('org_chart_data').eq('owner_user_id', owner_user_id).eq('company_id', companyId).maybeSingle();
  if (error) handleSupabaseDataError(error, OperationType.GET, 'org_chart_settings/' + companyId);
  return (data?.org_chart_data ?? null) as Record<string, unknown> | null;
}

export async function saveOrgChart(orgChartData: unknown, companyId = 'default') {
  const owner_user_id = await currentUserId();
  const { error } = await supabase.from('org_chart_settings').upsert({ owner_user_id, company_id: companyId, org_chart_data: orgChartData, updated_at: new Date().toISOString() }, { onConflict: 'owner_user_id,company_id' });
  if (error) handleSupabaseDataError(error, OperationType.WRITE, 'org_chart_settings/' + companyId);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseDataErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: { userId?: string | null };
}

export function handleSupabaseDataError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: SupabaseDataErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path,
  };
  console.error('Supabase data error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type Ref = { path: string; id?: string };
type CollectionRef = { path: string };

function doc(_db: unknown, path: string, id: string): Ref { return { path, id }; }
function collection(_db: unknown, path: string): CollectionRef { return { path }; }

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('احراز هویت برای دسترسی به اطلاعات لازم است.');
  return data.user.id;
}

function tableForCollection(name: string): string {
  const map: Record<string, string> = {
    personnel: 'personnel',
    employees: 'employees',
    compliance_reports: 'compliance_reports',
    regulatory_directives: 'regulatory_directives',
    regulatory_submissions: 'authority_submissions',
  };
  const table = map[name];
  if (!table) throw new Error(`Unsupported collection: ${name}`);
  return table;
}

export async function testSupabaseDataConnection() {
  try {
    const userId = await currentUserId();
    const { error } = await supabase.from('companies').select('id').eq('owner_user_id', userId).limit(1);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Supabase data connection failed:', error);
    return false;
  }
}

export async function savePersonnelToSupabase(personnelList: PersonnelNode[], companyId = 'default') {
  const owner_user_id = await currentUserId();
  const rows = personnelList.map(p => ({ owner_user_id, company_id: companyId, personnel_key:p.key, external_id:p.id, name:p.name, title:p.title, category:p.category }));
  const { error } = await supabase.from('personnel').upsert(rows, { onConflict:'owner_user_id,company_id,personnel_key' });
  if (error) handleSupabaseDataError(error, OperationType.WRITE, `companies/${companyId}/personnel`);
}
export async function saveSinglePersonnelToSupabase(p: PersonnelNode, companyId = 'default') { return savePersonnelToSupabase([p], companyId); }
export async function deletePersonnelFromSupabase(key:string, companyId='default') {
  const owner_user_id=await currentUserId(); const {error}=await supabase.from('personnel').delete().eq('owner_user_id',owner_user_id).eq('company_id',companyId).eq('personnel_key',key);
  if(error) handleSupabaseDataError(error,OperationType.DELETE,`companies/${companyId}/personnel/${key}`);
}
export async function saveSettingsToSupabase(settings:Partial<CompanySettings>, companyId='default') {
  const owner_user_id=await currentUserId();
  const {data:existing,error:readError}=await supabase.from('companies').select('issue_date,custom_logo_url').eq('owner_user_id',owner_user_id).eq('id',companyId).maybeSingle();
  if(readError) handleSupabaseDataError(readError,OperationType.GET,`companies/${companyId}`);
  const {error}=await supabase.from('companies').upsert({id:companyId,owner_user_id,issue_date:settings.issueDate??existing?.issue_date??'۱۴۰۴/۰۱/۰۱',custom_logo_url:settings.customLogo??existing?.custom_logo_url??null,updated_at:new Date().toISOString()},{onConflict:'id'});
  if(error) handleSupabaseDataError(error,OperationType.WRITE,`companies/${companyId}`);
}
export function subscribePersonnel(callback:(list:PersonnelNode[])=>void,companyId='default'){
  void (async()=>{try{const uid=await currentUserId();const {data,error}=await supabase.from('personnel').select('external_id,name,title,category,personnel_key').eq('owner_user_id',uid).eq('company_id',companyId);if(error)throw error;callback((data??[]).map((d:any)=>({id:d.external_id,name:d.name,title:d.title,category:d.category,key:d.personnel_key})));}catch(e){handleSupabaseDataError(e,OperationType.GET,`companies/${companyId}/personnel`);}})(); return ()=>{};
}
export function subscribeSettings(callback:(settings:CompanySettings)=>void,companyId='default'){
  void (async()=>{try{const uid=await currentUserId();const {data,error}=await supabase.from('companies').select('issue_date,custom_logo_url').eq('owner_user_id',uid).eq('id',companyId).maybeSingle();if(error)throw error;if(data)callback({issueDate:data.issue_date??'۱۴۰۴/۰۱/۰۱',customLogo:data.custom_logo_url??null});}catch(e){handleSupabaseDataError(e,OperationType.GET,`companies/${companyId}`);}})(); return ()=>{};
}
// Employee Record Interface
export interface EmployeeRecord {
  id: string;
  fullName: string;
  fatherName: string;
  grandfatherName: string;
  position: string;
  tazkiraNo: string;
  education: string;
  experience: string;
  phone: string;
  tin: string;
  email: string;
  photo?: string | null;
  signature?: string | null;
  formDate: string;
  updatedAt: string;
}

// Save employee record
export async function saveEmployee(employee: EmployeeRecord, companyId = 'default') {
  const owner_user_id = await currentUserId();
  const { error } = await supabase.from('employees').upsert({
    owner_user_id, company_id:companyId, employee_id:employee.id, full_name:employee.fullName,
    father_name:employee.fatherName, grandfather_name:employee.grandfatherName, position:employee.position,
    tazkira_no:employee.tazkiraNo, education:employee.education, experience:employee.experience, phone:employee.phone,
    tin:employee.tin, email:employee.email, photo_url:employee.photo ?? null, signature_url:employee.signature ?? null,
    form_date:employee.formDate, updated_at:new Date().toISOString()
  }, { onConflict:'owner_user_id,company_id,employee_id' });
  if(error) handleSupabaseDataError(error,OperationType.WRITE,`companies/${companyId}/employees/${employee.id}`);
}
export async function deleteEmployee(id:string, companyId='default') {
  const owner_user_id=await currentUserId();
  const {error}=await supabase.from('employees').delete().eq('owner_user_id',owner_user_id).eq('company_id',companyId).eq('employee_id',id);
  if(error) handleSupabaseDataError(error,OperationType.DELETE,`companies/${companyId}/employees/${id}`);
}
export function subscribeEmployees(callback:(employees:EmployeeRecord[])=>void,companyId='default'){
  void (async()=>{try{const uid=await currentUserId();const {data,error}=await supabase.from('employees').select('*').eq('owner_user_id',uid).eq('company_id',companyId);if(error)throw error;callback((data??[]).map((d:any)=>({id:d.employee_id,fullName:d.full_name,fatherName:d.father_name,grandfatherName:d.grandfather_name,position:d.position,tazkiraNo:d.tazkira_no,education:d.education,experience:d.experience,phone:d.phone,tin:d.tin,email:d.email,photo:d.photo_url,signature:d.signature_url,formDate:d.form_date,updatedAt:d.updated_at})));}catch(e){handleSupabaseDataError(e,OperationType.GET,`companies/${companyId}/employees`);}})();return ()=>{};
}

// Default Employee Data for Seeding
export const DEFAULT_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'EMP-001',
    fullName: 'برکت‌الله غفوری',
    fatherName: 'عبدالغفور',
    grandfatherName: '',
    position: 'سهمدار و رئیس هیئت مدیره',
    tazkiraNo: '1399-1104-55522',
    education: 'لیسانس کامپیوتر ساینس',
    experience: 'مدیریت ارشد شرکت و سهمدار اصلی.',
    phone: '0799112030',
    tin: '9003365203',
    email: 'b.ghafouri@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-002',
    fullName: 'بسم‌الله شیرزی',
    fatherName: 'دوست‌محمد',
    grandfatherName: '',
    position: 'رئیس هیئت نظار',
    tazkiraNo: '45188',
    education: 'لیسانس ادبیات پشتو',
    experience: 'نظارت بر امور داخلی و اداری.',
    phone: '0788223040',
    tin: '9005155800',
    email: 'bismillah.shirzai@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-003',
    fullName: 'برکت‌الله غفوری',
    fatherName: 'عبدالغفور',
    grandfatherName: '',
    position: 'عضو هیئت نظار',
    tazkiraNo: '1399-1104-55522',
    education: 'لیسانس اقتصاد',
    experience: 'کارشناس امور اقتصادی و نظارت.',
    phone: '0799112030',
    tin: '9003365203',
    email: 'b.ghafouri@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-004',
    fullName: 'عظیم‌الله رحمانی',
    fatherName: 'محمد آجان',
    grandfatherName: '',
    position: 'عضو هیئت نظار',
    tazkiraNo: '35806',
    education: 'لیسانس حقوق و علوم سیاسی',
    experience: 'متخصص در امور حقوقی و نظارت.',
    phone: '0777334050',
    tin: '9020613858',
    email: 'azim.rahmani@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-005',
    fullName: 'عبدالعزیز مهرزاد',
    fatherName: '',
    grandfatherName: '',
    position: 'مسئول پیروی از قوانین (Compliance Officer)',
    tazkiraNo: '97484',
    education: 'لیسانس اقتصاد و AML/CFT',
    experience: 'مدیریت اطاعت‌پذیری و رعایت مقررات DAB و FinTRACA.',
    phone: '0785445060',
    tin: '',
    email: 'compliance@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-006',
    fullName: 'صالح‌محمد',
    fatherName: 'عبدالرحیم',
    grandfatherName: '',
    position: 'مسئول عملیاتی',
    tazkiraNo: '48424',
    education: 'لیسانس حقوق و علوم سیاسی',
    experience: 'مدیریت عملیاتی و اجرایی شرکت.',
    phone: '0790556070',
    tin: '9020613858',
    email: 'operations@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-007',
    fullName: 'رحمت‌الله',
    fatherName: 'فیض‌الله',
    grandfatherName: '',
    position: 'نماینده تخار',
    tazkiraNo: '29384',
    education: 'فارغ صنف 12 عمومی',
    experience: 'مسئول نمایندگی ولایت تخار.',
    phone: '0701654321',
    tin: '',
    email: 'takhar.branch@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-008',
    fullName: 'عبید‌الله',
    fatherName: 'نصر‌الله',
    grandfatherName: '',
    position: 'خزانه دار تخار',
    tazkiraNo: '48392',
    education: 'فارغ صنف 12 عمومی',
    experience: 'امور خزانه‌داری در نمایندگی تخار.',
    phone: '',
    tin: '',
    email: '',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-009',
    fullName: 'اجمل احمدی',
    fatherName: 'نورآغا',
    grandfatherName: '',
    position: 'نماینده کابل',
    tazkiraNo: '46338',
    education: 'فارغ صنف 12 عمومی',
    experience: 'مسئول نمایندگی پایتخت (کابل).',
    phone: '0700123456',
    tin: '',
    email: 'kabul.branch@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-010',
    fullName: 'ریحان',
    fatherName: 'شیرآغا',
    grandfatherName: '',
    position: 'عضو نمایندگی کابل',
    tazkiraNo: '12345',
    education: 'فارغ صنف 12 عمومی',
    experience: 'فعالیت در بخش خدمات مشتریان کابل.',
    phone: '',
    tin: '',
    email: '',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-011',
    fullName: 'صدیق‌الله',
    fatherName: 'حبیب‌الله',
    grandfatherName: '',
    position: 'منشی و خزانه دار کابل',
    tazkiraNo: '67890',
    education: 'فارغ صنف 12 عمومی',
    experience: 'امور اداری و خزانه‌داری مرکز.',
    phone: '',
    tin: '',
    email: '',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-012',
    fullName: 'محمد‌يوسف',
    fatherName: 'عبدالمجید',
    grandfatherName: '',
    position: 'نماینده امام صاحب',
    tazkiraNo: '98680',
    education: 'فارغ صنف 12 عمومی',
    experience: 'مسئول نمایندگی ولسوالی امام صاحب.',
    phone: '0703456789',
    tin: '',
    email: 'imamsaheb.branch@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-013',
    fullName: 'عبدالمجید',
    fatherName: 'محمد‌يوسف',
    grandfatherName: '',
    position: 'خزانه دار امام صاحب',
    tazkiraNo: '54321',
    education: 'فارغ صنف 12 عمومی',
    experience: 'امور مالی و خزانه‌داری امام صاحب.',
    phone: '',
    tin: '',
    email: '',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'EMP-014',
    fullName: 'عتیق‌الله',
    fatherName: 'شمس‌الدین',
    grandfatherName: '',
    position: 'نماینده کشم',
    tazkiraNo: '7252',
    education: 'فارغ صنف 12 عمومی',
    experience: 'مسئول نمایندگی ولسوالی کشم.',
    phone: '0702987654',
    tin: '',
    email: 'keshem.branch@exchange.af',
    photo: null,
    signature: null,
    formDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  }
];

// Save multiple employees (seeding)
export async function seedEmployees(employees: EmployeeRecord[], companyId = 'default') {
  for (const employee of employees) await saveEmployee(employee, companyId);
}

// ----------------------------------------------------
// Compliance & Regulatory Reporting Models and Methods
// ----------------------------------------------------

export type ComplianceReportType = 'STR' | 'LCTR' | 'AML_PERIODIC' | 'SANCTIONS_AUDIT' | 'KYC_RISK_AUDIT';
export type ComplianceReportStatus = 'draft' | 'under_review' | 'approved' | 'submitted_to_dab' | 'archived';
export type ComplianceSeverity = 'normal' | 'medium' | 'high' | 'critical';

export interface SubjectDetails {
  fullName: string;
  fatherName?: string;
  tazkiraOrPassport: string;
  phone: string;
  address: string;
  nationality: string;
  occupation: string;
  tinOrBusinessReg?: string;
  isPEP?: boolean;
}

export interface TransactionDetails {
  amount: number;
  currency: string;
  amountAfnEquivalent: number;
  transactionDate: string;
  transactionType: 'buy_currency' | 'sell_currency' | 'domestic_remittance' | 'international_hawala' | 'cash_deposit';
  originCity: string;
  destinationCity: string;
  receiverName?: string;
  receiverPhone?: string;
  sourceOfFunds?: string;
  purposeOfTransaction?: string;
}

export interface ComplianceReport {
  id: string;
  reportNumber: string;
  type: ComplianceReportType;
  title: string;
  reportingPeriod: string;
  date: string;
  status: ComplianceReportStatus;
  severity: ComplianceSeverity;
  complianceOfficer: string;
  branchName: string;
  subjectDetails: SubjectDetails;
  transactionDetails: TransactionDetails;
  indicators: string[];
  narrativeFindings: string;
  riskRating: ComplianceSeverity;
  actionTaken: string;
  submissionRefNo?: string;
  submissionDate?: string;
  authorityTarget: 'DAB_NON_BANK' | 'FinTRACA' | 'GENERAL_SUPERVISION';
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RegulatoryDirective {
  id: string;
  directiveNo: string;
  title: string;
  issuingAuthority: string;
  issueDate: string;
  effectiveDate: string;
  complianceDeadline: string;
  category: 'AML_CFT' | 'CAPITAL_REQ' | 'BRANCH_RULES' | 'SANCTIONS' | 'REPORTING_TIMELINE' | 'TECH_SYSTEMS';
  priority: 'urgent' | 'high' | 'medium' | 'normal';
  summary: string;
  actionItems: string[];
  companyComplianceStatus: 'compliant' | 'in_progress' | 'action_required' | 'under_review';
  assignedOfficer: string;
  notes: string;
  updatedAt: string;
}

export interface AuthoritySubmission {
  id: string;
  submissionCode: string;
  reportId: string;
  reportTitle: string;
  reportType: ComplianceReportType;
  targetAuthority: string;
  submissionMethod: 'OFFICIAL_LETTER' | 'SECURE_DAB_PORTAL' | 'PHYSICAL_SUBMISSION' | 'EMAIL_ENCRYPTED';
  submissionDate: string;
  officialDispatchNo: string;
  incomingDabRefNo?: string;
  status: 'submitted' | 'received_by_dab' | 'clarification_requested' | 'accepted' | 'closed';
  receiptNotes?: string;
  submittedBy: string;
  updatedAt: string;
}

// Compliance Reports CRUD
export async function saveComplianceReport(report: ComplianceReport, companyId='default') {
  const uid=await currentUserId();
  const {error}=await supabase.from('compliance_reports').upsert({
    owner_user_id:uid,company_id:companyId,report_id:report.id,report_number:report.reportNumber,report_type:report.type,title:report.title,
    reporting_period:report.reportingPeriod,report_date:report.date,status:report.status,severity:report.severity,compliance_officer:report.complianceOfficer,
    branch_name:report.branchName,subject_details:report.subjectDetails,transaction_details:report.transactionDetails,indicators:report.indicators,
    narrative_findings:report.narrativeFindings,risk_rating:report.riskRating,action_taken:report.actionTaken,submission_ref_no:report.submissionRefNo??null,
    submission_date:report.submissionDate??null,authority_target:report.authorityTarget,attachments:report.attachments??[],updated_at:new Date().toISOString()
  },{onConflict:'owner_user_id,company_id,report_id'});
  if(error)handleSupabaseDataError(error,OperationType.WRITE,`companies/${companyId}/compliance_reports/${report.id}`);
}
export async function deleteComplianceReport(id:string,companyId='default'){const uid=await currentUserId();const {error}=await supabase.from('compliance_reports').delete().eq('owner_user_id',uid).eq('company_id',companyId).eq('report_id',id);if(error)handleSupabaseDataError(error,OperationType.DELETE,`companies/${companyId}/compliance_reports/${id}`);}
export function subscribeComplianceReports(callback:(reports:ComplianceReport[])=>void,companyId='default'){void(async()=>{try{const uid=await currentUserId();const {data,error}=await supabase.from('compliance_reports').select('*').eq('owner_user_id',uid).eq('company_id',companyId);if(error)throw error;callback((data??[]).map((d:any)=>({id:d.report_id,reportNumber:d.report_number,type:d.report_type,title:d.title,reportingPeriod:d.reporting_period,date:d.report_date,status:d.status,severity:d.severity,complianceOfficer:d.compliance_officer,branchName:d.branch_name,subjectDetails:d.subject_details,transactionDetails:d.transaction_details,indicators:d.indicators,narrativeFindings:d.narrative_findings,riskRating:d.risk_rating,actionTaken:d.action_taken,submissionRefNo:d.submission_ref_no,submissionDate:d.submission_date,authorityTarget:d.authority_target,attachments:d.attachments,createdAt:d.created_at,updatedAt:d.updated_at})));}catch(e){handleSupabaseDataError(e,OperationType.GET,`companies/${companyId}/compliance_reports`);}})();return ()=>{};}
// Regulatory Directives CRUD
export async function saveRegulatoryDirective(directive:RegulatoryDirective,companyId='default'){const uid=await currentUserId();const {error}=await supabase.from('regulatory_directives').upsert({owner_user_id:uid,company_id:companyId,directive_id:directive.id,directive_no:directive.directiveNo,title:directive.title,issuing_authority:directive.issuingAuthority,issue_date:directive.issueDate,effective_date:directive.effectiveDate,compliance_deadline:directive.complianceDeadline,category:directive.category,priority:directive.priority,summary:directive.summary,action_items:directive.actionItems,company_compliance_status:directive.companyComplianceStatus,assigned_officer:directive.assignedOfficer,notes:directive.notes,updated_at:new Date().toISOString()},{onConflict:'owner_user_id,company_id,directive_id'});if(error)handleSupabaseDataError(error,OperationType.WRITE,`companies/${companyId}/regulatory_directives/${directive.id}`);}
export async function deleteRegulatoryDirective(id:string,companyId='default'){const uid=await currentUserId();const {error}=await supabase.from('regulatory_directives').delete().eq('owner_user_id',uid).eq('company_id',companyId).eq('directive_id',id);if(error)handleSupabaseDataError(error,OperationType.DELETE,`companies/${companyId}/regulatory_directives/${id}`);}
export function subscribeRegulatoryDirectives(callback:(directives:RegulatoryDirective[])=>void,companyId='default'){void(async()=>{try{const uid=await currentUserId();const {data,error}=await supabase.from('regulatory_directives').select('*').eq('owner_user_id',uid).eq('company_id',companyId);if(error)throw error;callback((data??[]).map((d:any)=>({id:d.directive_id,directiveNo:d.directive_no,title:d.title,issuingAuthority:d.issuing_authority,issueDate:d.issue_date,effectiveDate:d.effective_date,complianceDeadline:d.compliance_deadline,category:d.category,priority:d.priority,summary:d.summary,actionItems:d.action_items,companyComplianceStatus:d.company_compliance_status,assignedOfficer:d.assigned_officer,notes:d.notes,updatedAt:d.updated_at})));}catch(e){handleSupabaseDataError(e,OperationType.GET,`companies/${companyId}/regulatory_directives`);}})();return ()=>{};}
// Authority Submissions CRUD
export async function saveAuthoritySubmission(submission:AuthoritySubmission,companyId='default'){const uid=await currentUserId();const {error}=await supabase.from('authority_submissions').upsert({owner_user_id:uid,company_id:companyId,submission_id:submission.id,submission_code:submission.submissionCode,report_id:submission.reportId,report_title:submission.reportTitle,report_type:submission.reportType,target_authority:submission.targetAuthority,submission_method:submission.submissionMethod,submission_date:submission.submissionDate,official_dispatch_no:submission.officialDispatchNo,incoming_dab_ref_no:submission.incomingDabRefNo??null,status:submission.status,receipt_notes:submission.receiptNotes??null,submitted_by:submission.submittedBy,updated_at:new Date().toISOString()},{onConflict:'owner_user_id,company_id,submission_id'});if(error)handleSupabaseDataError(error,OperationType.WRITE,`companies/${companyId}/regulatory_submissions/${submission.id}`);}
export async function deleteAuthoritySubmission(id:string,companyId='default'){const uid=await currentUserId();const {error}=await supabase.from('authority_submissions').delete().eq('owner_user_id',uid).eq('company_id',companyId).eq('submission_id',id);if(error)handleSupabaseDataError(error,OperationType.DELETE,`companies/${companyId}/regulatory_submissions/${id}`);}
export function subscribeAuthoritySubmissions(callback:(submissions:AuthoritySubmission[])=>void,companyId='default'){void(async()=>{try{const uid=await currentUserId();const {data,error}=await supabase.from('authority_submissions').select('*').eq('owner_user_id',uid).eq('company_id',companyId);if(error)throw error;callback((data??[]).map((d:any)=>({id:d.submission_id,submissionCode:d.submission_code,reportId:d.report_id,reportTitle:d.report_title,reportType:d.report_type,targetAuthority:d.target_authority,submissionMethod:d.submission_method,submissionDate:d.submission_date,officialDispatchNo:d.official_dispatch_no,incomingDabRefNo:d.incoming_dab_ref_no,status:d.status,receiptNotes:d.receipt_notes,submittedBy:d.submitted_by,updatedAt:d.updated_at})));}catch(e){handleSupabaseDataError(e,OperationType.GET,`companies/${companyId}/regulatory_submissions`);}})();return ()=>{};}
