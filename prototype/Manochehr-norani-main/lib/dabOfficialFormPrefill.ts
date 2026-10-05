import { barakatullahGhafouriProfile } from '@/lib/barakatullahGhafouriProfile';
import type { DabOfficialFormDefinition } from '@/lib/dabOfficialFormRegistry';

export type DabFormValues = Record<string, string>;

const profile = barakatullahGhafouriProfile;

const companyValues: DabFormValues = {
  companyName: profile.legalName,
  licenseNo: profile.licenseNo,
  province: profile.province,
  district: profile.district,
  address: profile.address,
  phone: profile.phone,
  email: profile.email,
};

const complianceName = `${profile.complianceOfficer.name} ولد ${profile.complianceOfficer.fatherName}`;
const complianceIdentity = profile.complianceOfficer.identityNo;

export function getDabOfficialFormPrefill(form: DabOfficialFormDefinition): DabFormValues {
  const values: DabFormValues = { ...companyValues };

  switch (form.id) {
    case 'license-renewal':
      Object.assign(values, {
        expiryDate: profile.licenseExpiryDate,
        authorizedName: complianceName,
      });
      break;
    case 'aml-cft-policy':
      Object.assign(values, {
        complianceOfficer: `${complianceName} — تذکره ${complianceIdentity} — ${profile.complianceOfficer.education}`,
      });
      break;
    case 'name-change':
      Object.assign(values, {
        oldName: profile.formerName,
        newName: profile.legalName,
      });
      break;
    case 'location-change':
      Object.assign(values, {
        oldLocation: profile.address,
        newLocation: profile.address,
      });
      break;
    case 'ownership-transfer':
      Object.assign(values, {
        transferor: profile.formerShareholders[0]?.name ?? '',
        transferee: profile.shareholders[0]?.name ?? '',
        sharePercent: String(profile.formerShareholders[0]?.transferredPercent ?? ''),
      });
      break;
    case 'articles':
      Object.assign(values, {
        companyPurpose: 'فعالیت صرافی و خدمات پولی مطابق جواز و مقررات نافذه د افغانستان بانک.',
        capital: String(profile.shareholders[0]?.capital ?? ''),
        shareStructure: profile.shareholders.map((item) => `${item.name} — ${item.sharePercent}%`).join('؛ '),
        management: profile.management.map((item) => `${item.name} — ${item.role}`).join('؛ '),
        registeredAddress: profile.address,
      });
      break;
    case 'agency-establishment':
    case 'agency-renewal':
    case 'agency-change':
      Object.assign(values, {
        agencyName: profile.branches[0] ? `نمایندگی ${profile.branches[0].location}` : '',
        agencyNo: profile.branches[0]?.no ?? '',
        market: profile.branches[0]?.market ?? '',
        shopNo: profile.branches[0]?.shopNo ?? '',
        province: profile.branches[0]?.location ?? profile.province,
        representativeFullName: profile.branches[0]?.representative ?? '',
        representativeFatherName: profile.branches[0]?.representativeFather ?? '',
        representativeIdentityNo: profile.branches[0]?.identityNo ?? '',
        representativeEducation: profile.branches[0]?.education ?? '',
        representativePhone: profile.branches[0]?.phone ?? '',
      });
      break;
    case 'shareholder-guarantee':
      Object.assign(values, {
        shareholderFullName: profile.shareholders[0]?.name ?? '',
        shareholderFatherName: profile.shareholders[0]?.fatherName ?? '',
        shareholderIdentityNo: profile.shareholders[0]?.identityNo ?? '',
        shareholderEducation: profile.shareholders[0]?.education ?? '',
        guarantorFullName: profile.guarantors[0]?.name ?? '',
        guarantorFatherName: profile.guarantors[0]?.fatherName ?? '',
        guarantorIdentityNo: profile.guarantors[0]?.identityNo ?? '',
        guarantorPhone: profile.guarantors[0]?.phone ?? '',
      });
      break;
    case 'commencement-letter':
      Object.assign(values, {
        approvedLicenseNo: profile.licenseNo,
        authorizedPerson: complianceName,
        operatingAddress: profile.address,
      });
      break;
    case 'organization-chart':
      Object.assign(values, {
        details: profile.management.map((item) => `${item.role}: ${item.name}`).join('\n'),
      });
      break;
    case 'employee-signature-samples':
    case 'employee-introduction-letter': {
      const staffDetails: string[] = [];
      profile.branches.forEach((branch) => {
        branch.staff.forEach((staff) => {
          staffDetails.push(`${staff.name} ولد ${staff.fatherName} — ${staff.education}`);
        });
      });
      Object.assign(values, {
        details: staffDetails.join('\n'),
      });
      break;
    }
    default:
      break;
  }

  return values;
}
