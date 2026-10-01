import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { customers, customerLicenses, customerShareholders, customerEmployees, customerBranches, customerBankAccounts, customerGuarantees } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { saveCustomerLicense, saveCustomerShareholder, saveCustomerEmployee, saveCustomerBranch, saveCustomerBankAccount, saveCustomerGuarantee } from "@/actions/customer-business";
import { FormDialog, type Field } from "@/components/forms";
import { Badge, Card, PageHeader, Table } from "@/components/ui";

const L = {
  fa: {
    profile:"پروفایل معلومات تجارتی", license:"جوازها", shareholders:"سهمداران", employees:"کارمندان", branches:"نمایندگی‌ها", banks:"حساب‌های بانکی", guarantees:"ضمانت‌ها",
    add:"افزودن", edit:"ویرایش", fullName:"نام مکمل", father:"نام پدر", grandfather:"ولدیت", nationalId:"نمبر تذکره", tin:"TIN", phone:"شماره تماس", email:"ایمیل", province:"ولایت", district:"ولسوالی", area:"ناحیه", address:"آدرس",
    licenseNo:"شماره جواز", licenseType:"نوع جواز", authority:"اداره صادرکننده", issue:"تاریخ صدور", expiry:"تاریخ ختم", activity:"نوع فعالیت", services:"نوع خدمات (هر مورد در یک خط)", capital:"سرمایه مورد نیاز", workingCapital:"سرمایه کاری", guaranteeAmount:"مبلغ تضمین", education:"درجه تحصیل", field:"رشته تحصیل", experience:"تجربه کاری (سال)", ownership:"فیصدی سهم", shareValue:"ارزش سهم", role:"موقف/نقش", position:"وظیفه", department:"بخش", employment:"تاریخ استخدام", salary:"معاش", branchNo:"شماره نمایندگی", branchName:"نام نمایندگی", village:"قریه", market:"مارکیت", floor:"منزل", shop:"شماره دکان", representative:"نماینده با صلاحیت", bank:"بانک", accountName:"نام حساب", accountNumber:"نمبر حساب", currency:"اسعار", beneficiary:"سهمدار تضمین‌شونده", guarantor:"نام ضامن", guarantorFather:"نام پدر ضامن", guarantorId:"نمبر تذکره ضامن", guarantorTin:"TIN ضامن", guarantorPhone:"شماره تماس ضامن", guarantorBusiness:"نام تشبث ضامن", businessType:"نوع فعالیت تشبث", businessLicense:"شماره جواز تشبث", businessAddress:"آدرس تشبث", guaranteeType:"نوع ضمانت", start:"شروع اعتبار", end:"ختم اعتبار", notes:"یادداشت", noData:"رکوردی ثبت نشده است", back:"بازگشت"
  },
  ps: {
    profile:"د سوداګریزو معلوماتو پروفایل", license:"جوازونه", shareholders:"ونډه‌وال", employees:"کارکوونکي", branches:"نمایندګۍ", banks:"بانکي حسابونه", guarantees:"ضمانتونه",
    add:"زیاتول", edit:"سمون", fullName:"بشپړ نوم", father:"د پلار نوم", grandfather:"د نیکه نوم", nationalId:"د تذکرې شمېره", tin:"TIN", phone:"د اړیکې شمېره", email:"بریښنالیک", province:"ولایت", district:"ولسوالۍ", area:"ناحیه", address:"پته",
    licenseNo:"د جواز شمېره", licenseType:"د جواز ډول", authority:"صادره اداره", issue:"د صدور نېټه", expiry:"د ختم نېټه", activity:"فعالیت", services:"د خدمتونو ډولونه", capital:"اړینه سرمایه", workingCapital:"کاري سرمایه", guaranteeAmount:"د ضمانت مبلغ", education:"د زده کړې کچه", field:"د زده کړې رشته", experience:"کاري تجربه (کال)", ownership:"د ونډې سلنه", shareValue:"د ونډې ارزښت", role:"دنده/نقش", position:"دنده", department:"څانګه", employment:"د استخدام نېټه", salary:"معاش", branchNo:"د نمایندګۍ شمېره", branchName:"د نمایندګۍ نوم", village:"کلی", market:"مارکېټ", floor:"منزل", shop:"د دوکان شمېره", representative:"با صلاحیته استازی", bank:"بانک", accountName:"د حساب نوم", accountNumber:"د حساب شمېره", currency:"اسعار", beneficiary:"تضمین شوی ونډه‌وال", guarantor:"د ضامن نوم", guarantorFather:"د ضامن د پلار نوم", guarantorId:"د ضامن تذکره", guarantorTin:"د ضامن TIN", guarantorPhone:"د ضامن اړیکه", guarantorBusiness:"د ضامن تشبث", businessType:"د تشبث فعالیت", businessLicense:"د تشبث جواز", businessAddress:"د تشبث پته", guaranteeType:"د ضمانت ډول", start:"د اعتبار پیل", end:"د اعتبار ختم", notes:"یادښت", noData:"هیڅ ریکارډ نشته", back:"شاته"
  },
  en: {
    profile:"Business information profile", license:"Licences", shareholders:"Shareholders", employees:"Employees", branches:"Branches", banks:"Bank accounts", guarantees:"Guarantees",
    add:"Add", edit:"Edit", fullName:"Full name", father:"Father name", grandfather:"Grandfather name", nationalId:"National ID", tin:"TIN", phone:"Phone", email:"Email", province:"Province", district:"District", area:"Area", address:"Address",
    licenseNo:"License number", licenseType:"License type", authority:"Issuing authority", issue:"Issue date", expiry:"Expiry date", activity:"Activity", services:"Service types (one per line)", capital:"Required capital", workingCapital:"Working capital", guaranteeAmount:"Guarantee amount", education:"Education level", field:"Education field", experience:"Work experience (years)", ownership:"Ownership %", shareValue:"Share value", role:"Role", position:"Position", department:"Department", employment:"Employment date", salary:"Salary", branchNo:"Branch number", branchName:"Branch name", village:"Village", market:"Market", floor:"Floor", shop:"Shop number", representative:"Representative", bank:"Bank", accountName:"Account name", accountNumber:"Account number", currency:"Currency", beneficiary:"Beneficiary shareholder", guarantor:"Guarantor name", guarantorFather:"Guarantor father name", guarantorId:"Guarantor national ID", guarantorTin:"Guarantor TIN", guarantorPhone:"Guarantor phone", guarantorBusiness:"Guarantor business", businessType:"Business type", businessLicense:"Business license", businessAddress:"Business address", guaranteeType:"Guarantee type", start:"Start date", end:"End date", notes:"Notes", noData:"No records", back:"Back"
  }
} as const;

export default async function CustomerBusinessProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, lang } = await pageContext("customers.read");
  const l = L[lang];
  const [customer] = await db.select().from(customers).where(and(eq(customers.id,id),eq(customers.organizationId,ctx.org.id)));
  if (!customer) notFound();

  const [licenses, shareholders, employees, branches, banks, guarantees] = await Promise.all([
    db.select().from(customerLicenses).where(and(eq(customerLicenses.organizationId,ctx.org.id),eq(customerLicenses.customerId,id))).orderBy(desc(customerLicenses.createdAt)),
    db.select().from(customerShareholders).where(and(eq(customerShareholders.organizationId,ctx.org.id),eq(customerShareholders.customerId,id))).orderBy(desc(customerShareholders.createdAt)),
    db.select().from(customerEmployees).where(and(eq(customerEmployees.organizationId,ctx.org.id),eq(customerEmployees.customerId,id))).orderBy(desc(customerEmployees.createdAt)),
    db.select().from(customerBranches).where(and(eq(customerBranches.organizationId,ctx.org.id),eq(customerBranches.customerId,id))).orderBy(desc(customerBranches.createdAt)),
    db.select().from(customerBankAccounts).where(and(eq(customerBankAccounts.organizationId,ctx.org.id),eq(customerBankAccounts.customerId,id))).orderBy(desc(customerBankAccounts.createdAt)),
    db.select().from(customerGuarantees).where(and(eq(customerGuarantees.organizationId,ctx.org.id),eq(customerGuarantees.customerId,id))).orderBy(desc(customerGuarantees.createdAt)),
  ]);
  const canWrite = ctx.can("customers.write");

  const licenseFields: Field[] = [
    {name:"licenseNumber",label:l.licenseNo,required:true},{name:"licenseType",label:l.licenseType,required:true,defaultValue:"money_services"},
    {name:"issuingAuthority",label:l.authority},{name:"issueDate",label:l.issue,type:"date"},{name:"expiryDate",label:l.expiry,type:"date"},
    {name:"activity",label:l.activity},{name:"serviceTypes",label:l.services,type:"textarea",full:true},{name:"requiredCapital",label:l.capital,type:"number"},
    {name:"workingCapital",label:l.workingCapital,type:"number"},{name:"guaranteeAmount",label:l.guaranteeAmount,type:"number"},{name:"notes",label:l.notes,type:"textarea",full:true}
  ];
  const personFields = (employee=false): Field[] => [
    {name:"fullName",label:l.fullName,required:true},{name:"fatherName",label:l.father},{name:"grandfatherName",label:l.grandfather,...(!employee?{}:{})},
    {name:"nationalId",label:l.nationalId},{name:"tin",label:l.tin},{name:"phone",label:l.phone},{name:"email",label:l.email,type:"email"},
    {name:"province",label:l.province},{name:"district",label:l.district},{name:"area",label:l.area},{name:"address",label:l.address,full:true},
    {name:"educationLevel",label:l.education},{name:"educationField",label:l.field},{name:"workExperienceYears",label:l.experience,type:"number"},
    ...(employee ? [{name:"position",label:l.position},{name:"department",label:l.department},{name:"employmentDate",label:l.employment,type:"date"},{name:"salary",label:l.salary,type:"number"}] : [{name:"ownershipPercentage",label:l.ownership,type:"number"},{name:"shareValue",label:l.shareValue,type:"number"},{name:"role",label:l.role}]),
    {name:"notes",label:l.notes,type:"textarea",full:true}
  ];
  const branchFields: Field[] = [
    {name:"branchNumber",label:l.branchNo},{name:"name",label:l.branchName},{name:"province",label:l.province,required:true},{name:"district",label:l.district},{name:"area",label:l.area},{name:"village",label:l.village},
    {name:"market",label:l.market},{name:"floor",label:l.floor},{name:"shopNumber",label:l.shop},{name:"address",label:l.address,full:true},{name:"phone",label:l.phone},{name:"email",label:l.email},
    {name:"representativeEmployeeId",label:l.representative,type:"select",options:employees.map(e=>({value:e.id,label:e.fullName})),},{name:"licenseNumber",label:l.licenseNo},{name:"issueDate",label:l.issue,type:"date"},{name:"expiryDate",label:l.expiry,type:"date"}
  ];
  const bankFields: Field[] = [
    {name:"bankName",label:l.bank,required:true},{name:"accountName",label:l.accountName,required:true},{name:"accountNumber",label:l.accountNumber,required:true},{name:"branchNumber",label:l.branchNo},{name:"currency",label:l.currency,defaultValue:"AFN"}
  ];
  const guaranteeFields: Field[] = [
    {name:"beneficiaryShareholderId",label:l.beneficiary,type:"select",options:shareholders.map(s=>({value:s.id,label:s.fullName}))},
    {name:"guarantorName",label:l.guarantor,required:true},{name:"guarantorFatherName",label:l.guarantorFather},{name:"guarantorNationalId",label:l.guarantorId},{name:"guarantorTin",label:l.guarantorTin},{name:"guarantorPhone",label:l.guarantorPhone},
    {name:"guarantorProvince",label:l.province},{name:"guarantorDistrict",label:l.district},{name:"guarantorArea",label:l.area},{name:"guarantorVillage",label:l.village},
    {name:"businessName",label:l.guarantorBusiness},{name:"businessType",label:l.businessType},{name:"businessLicenseNumber",label:l.businessLicense},{name:"businessAddress",label:l.businessAddress,full:true},
    {name:"guaranteeType",label:l.guaranteeType,defaultValue:"shareholder"},{name:"startDate",label:l.start,type:"date"},{name:"endDate",label:l.end,type:"date"},{name:"notes",label:l.notes,type:"textarea",full:true}
  ];

  return <><PageHeader title={l.profile} subtitle={customer.name} actions={<Link href="/customers" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{l.back}</Link>} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={l.license} actions={canWrite && <FormDialog title={l.add} triggerLabel={l.add} action={saveCustomerLicense} fields={licenseFields} hidden={{customerId:id}} wide />}>
        <Table headers={[l.licenseNo,l.issue,l.expiry,l.activity]} empty={l.noData} rows={licenses.map(x=>[x.licenseNumber,x.issueDate??"—",x.expiryDate??"—",x.activity??"—"])} />
      </Card>
      <Card title={l.shareholders} actions={canWrite && <FormDialog title={l.add} triggerLabel={l.add} action={saveCustomerShareholder} fields={personFields(false)} hidden={{customerId:id}} wide />}>
        <Table headers={[l.fullName,l.nationalId,l.ownership,l.phone]} empty={l.noData} rows={shareholders.map(x=>[x.fullName,x.nationalId??"—",x.ownershipPercentage==null?"—":String(x.ownershipPercentage),x.phone??"—"])} />
      </Card>
      <Card title={l.employees} actions={canWrite && <FormDialog title={l.add} triggerLabel={l.add} action={saveCustomerEmployee} fields={personFields(true)} hidden={{customerId:id}} wide />}>
        <Table headers={[l.fullName,l.position,l.nationalId,l.phone]} empty={l.noData} rows={employees.map(x=>[x.fullName,x.position??"—",x.nationalId??"—",x.phone??"—"])} />
      </Card>
      <Card title={l.branches} actions={canWrite && <FormDialog title={l.add} triggerLabel={l.add} action={saveCustomerBranch} fields={branchFields} hidden={{customerId:id}} wide />}>
        <Table headers={[l.branchNo,l.branchName,l.province,l.shop]} empty={l.noData} rows={branches.map(x=>[x.branchNumber??"—",x.name??"—",x.province??"—",x.shopNumber??"—"])} />
      </Card>
      <Card title={l.banks} actions={canWrite && <FormDialog title={l.add} triggerLabel={l.add} action={saveCustomerBankAccount} fields={bankFields} hidden={{customerId:id}} />}>
        <Table headers={[l.bank,l.accountName,l.accountNumber,l.currency]} empty={l.noData} rows={banks.map(x=>[x.bankName,x.accountName,x.accountNumber,x.currency])} />
      </Card>
      <Card title={l.guarantees} actions={canWrite && <FormDialog title={l.add} triggerLabel={l.add} action={saveCustomerGuarantee} fields={guaranteeFields} hidden={{customerId:id}} wide />}>
        <Table headers={[l.guarantor,l.guarantorId,l.businessType,l.start,l.end]} empty={l.noData} rows={guarantees.map(x=>[x.guarantorName,x.guarantorNationalId??"—",x.businessType??"—",x.startDate??"—",x.endDate??"—"])} />
      </Card>
    </div>
  </>;
}
