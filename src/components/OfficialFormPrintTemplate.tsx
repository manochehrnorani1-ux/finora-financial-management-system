import type { ReactNode } from "react";

type Props = {
  formKey: string;
  formName: string;
  agency: string;
  formNumber?: string | null;
  internalNumber: string;
  language: "fa" | "ps" | "en";
  values: Record<string, unknown>;
};

const label = (key: string, lang: Props["language"]) => {
  const d: Record<string,string> = { shareholders:lang==="en"?"Shareholders":lang==="ps"?"ونډه‌وال":"سهمداران", employees:lang==="en"?"Employees":lang==="ps"?"کارکوونکي":"کارمندان", branches:lang==="en"?"Branches":lang==="ps"?"نمایندګۍ":"نمایندگی‌ها", banks:lang==="en"?"Bank accounts":lang==="ps"?"بانکي حسابونه":"حساب‌های بانکی",
    company: lang==="en"?"Company name":lang==="ps"?"د شرکت نوم":"نام شرکت",
    license: lang==="en"?"Licence number":lang==="ps"?"د جواز شمېره":"شماره جواز",
    tin: "TIN", phone: lang==="en"?"Telephone":lang==="ps"?"د اړیکې شمېره":"شماره تماس",
    father: lang==="en"?"Father name":lang==="ps"?"د پلار نوم":"نام پدر",
    id: lang==="en"?"National ID":lang==="ps"?"د تذکرې شمېره":"نمبر تذکره",
    province: lang==="en"?"Province":lang==="ps"?"ولایت":"ولایت",
    district: lang==="en"?"District":lang==="ps"?"ولسوالي":"ولسوالی",
    area: lang==="en"?"Area":lang==="ps"?"ناحیه":"ناحیه",
    market: lang==="en"?"Market":lang==="ps"?"مارکېټ":"مارکیت",
    shop: lang==="en"?"Shop number":lang==="ps"?"دکان شمېره":"شماره دکان",
    branch: lang==="en"?"Branch number":lang==="ps"?"د نمایندګۍ شمېره":"شماره نمایندگی",
    position: lang==="en"?"Position":lang==="ps"?"دنده":"موقف",
    education: lang==="en"?"Education":lang==="ps"?"تحصیلي سویه":"سویه تحصیلی",
    share: lang==="en"?"Ownership %":lang==="ps"?"د ونډې سلنه":"فیصدی سهم",
    account: lang==="en"?"Account number":lang==="ps"?"د حساب شمېره":"نمبر حساب",
    bank: lang==="en"?"Bank":lang==="ps"?"بانک":"بانک", address: lang==="en"?"Address":lang==="ps"?"پته":"آدرس", email: lang==="en"?"Email":lang==="ps"?"برېښنالیک":"ایمیل", signature_date: lang==="en"?"Signature date":lang==="ps"?"د لاسلیک نېټه":"تاریخ امضاء", change_requested: lang==="en"?"Major change requested?":lang==="ps"?"لوی بدلون غوښتل شوی؟":"آیا تغییر عمده مطالبه شده است؟", change_description: lang==="en"?"Change description":lang==="ps"?"د بدلون تشریح":"شرح تغییرات", tax_clearance_status: lang==="en"?"Tax clearance status":lang==="ps"?"د مالیاتي تصفیې حالت":"وضعیت رفع مسئولیت مالیاتی", guarantee_status: lang==="en"?"Guarantee status":lang==="ps"?"د ضمانت حالت":"وضعیت تضمین",
    phone: lang==="en"?"Telephone":lang==="ps"?"د اړیکې شمېره":"شماره تماس"
  };
  const aliases: Record<string,string> = { company_name:"company", license_number:"license", shop_number:"shop", branch_number:"branch", branch_province:"province", branch_district:"district", branch_area:"area", branch_market:"market", representative_father:"father", representative_tazkira:"id", representative_phone:"phone", representative_name:"company", office_address:"address", representative_education:"education", representative_education_field:"education", signature_date:"signature_date", shareholders:"shareholders", employees:"employees", branches:"branches", banks:"banks" };\n  return d[aliases[key] ?? key] ?? key;
};

const value = (values: Record<string,unknown>, key:string) => {
  const v=values[key];
  return v===null || v===undefined || v==="" ? "________________" : String(v);
};

function Section({title, children}:{title:string;children:ReactNode}) {
  return <section className="print-section"><h2 className="print-section-title">{title}</h2>{children}</section>;
}

function Fields({values, keys, language}:{values:Record<string,unknown>;keys:string[];language:Props["language"]}) {
  return <div className="print-fields">{keys.map(k=><div className="print-field" key={k}><span>{label(k,language)}</span><strong>{value(values,k)}</strong></div>)}</div>;
}

function Table({headers, rows}:{headers:string[];rows:Array<Record<string,unknown>>}) {
  return <div className="print-table-wrap"><table className="print-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={String(r.id??i)}>{headers.map(h=><td key={h}>{String(r[h]??"")}</td>)}</tr>)}</tbody></table></div>;
}

function BusinessTables({values,language}:{values:Record<string,unknown>;language:Props["language"]}) {
  const b=(values._zipBusiness??{}) as Record<string,unknown>;
  const sh=Array.isArray(b.shareholders)?b.shareholders as Array<Record<string,unknown>>:[];
  const br=Array.isArray(b.branches)?b.branches as Array<Record<string,unknown>>:[];
  const em=Array.isArray(b.employees)?b.employees as Array<Record<string,unknown>>:[];
  const ba=Array.isArray(b.bankAccounts)?b.bankAccounts as Array<Record<string,unknown>>:[];
  return <>
    <Section title={label("shareholders",language)}><Table headers={[label("company",language),label("father",language),label("id",language),label("share",language)]} rows={sh.map(x=>({[label("company",language)]:x.fullName,[label("father",language)]:x.fatherName,[label("id",language)]:x.nationalId,[label("share",language)]:x.ownershipPercentage}))}/></Section>
    <Section title={label("branches",language)}><Table headers={[label("branch",language),label("company",language),label("province",language),label("district",language),label("market",language),label("shop",language)]} rows={br.map(x=>({[label("branch",language)]:x.branchNumber,[label("company",language)]:x.name,[label("province",language)]:x.province,[label("district",language)]:x.district,[label("market",language)]:x.market,[label("shop",language)]:x.shopNumber}))}/></Section>
    <Section title={label("employees",language)}><Table headers={[label("company",language),label("father",language),label("id",language),label("position",language),label("education",language),label("phone",language)]} rows={em.map(x=>({[label("company",language)]:x.fullName,[label("father",language)]:x.fatherName,[label("id",language)]:x.nationalId,[label("position",language)]:x.position,[label("education",language)]:x.educationLevel,[label("phone",language)]:x.phone}))}/></Section>
    <Section title={label("banks",language)}><Table headers={[label("account",language),label("bank",language)]} rows={ba.map(x=>({[label("account",language)]:x.accountNumber,[label("bank",language)]:x.bankName}))}/></Section>
  </>;
}

export function OfficialFormPrintTemplate({formKey,formName,agency,formNumber,internalNumber,language,values}:Props) {
  const dir=language==="en"?"ltr":"rtl";
  const titles:Record<string,string>={ "dab-msp-renewal":language==="en"?"Money Services Licence Renewal Application":language==="ps"?"د پولي خدمتونو د جواز د تمدید غوښتنلیک فورم":"فورم درخواستی تمدید جواز شرکت صرافی و خدمات پولی", "dab-msp-branch-renewal":language==="en"?"Money Services Branch Renewal Form":language==="ps"?"د نمایندګۍ د جواز د تمدید فورم":"فورم تمدید نمایندگی شرکت صرافی و خدمات پولی", "dab-msp-guarantee-2":language==="en"?"Money Services Shareholder Guarantee Form":language==="ps"?"د ونډه‌والو د ضمانت فورم":"فورم تضمین سر سهمدار / سهمداران شرکت صرافی و خدمات پولی" };
  const body=formKey==="dab-msp-renewal"
    ? <><Section title="1"><Fields values={values} keys={["company_name","license_number","tin","province","district","area","market","shop_number","phone"]} language={language}/></Section><BusinessTables values={values} language={language}/><Section title="2"><Fields values={values} keys={["change_requested","change_description","tax_clearance_status","guarantee_status","signature_date"]} language={language}/></Section></>
    : formKey==="dab-msp-branch-renewal"
    ? <><Section title="1"><Fields values={values} keys={["company_name","license_number","office_address","branch_number","branch_name","branch_province","branch_district","branch_market","branch_shop"]} language={language}/></Section><Section title="2"><Fields values={values} keys={["representative_name","representative_father","representative_tazkira","representative_phone","representative_education","representative_education_field"]} language={language}/></Section><Section title="3"><Fields values={values} keys={["license_current","representative_id_submitted","education_evidence_submitted","signature_date"]} language={language}/></Section></>
    : formKey==="dab-msp-guarantee-2"
    ? <><BusinessTables values={values} language={language}/><Section title="3"><Fields values={values} keys={["company_name","license_number","guarantee_validity","signature_date"]} language={language}/></Section></>
    : <Section title={language==="en"?"Form data":"معلومات فورم"}><Fields values={values} keys={Object.keys(values).filter(k=>!k.startsWith("_"))} language={language}/></Section>;
  return <main className="print-document" dir={dir} lang={language}>
    <header className="print-document-header"><div><div className="print-agency">{agency}</div><div className="print-title">{titles[formKey]??formName}</div></div><div className="print-meta"><div>{formNumber??""}</div><div>{internalNumber}</div></div></header>
    {body}
    <div className="print-signatures"><div className="print-signature">________________<br />{label("company",language)}</div><div className="print-signature">________________<br />{language==="en"?"Signature / Stamp":language==="ps"?"لاسلیک / مهر":"امضاء / مهر"}</div></div>
    <footer className="print-document-footer"><span>FINORA</span><span>{language==="en"?"Print copy":language==="ps"?"د چاپ نسخه":"نسخه چاپی"}</span></footer>
  </main>;
}
