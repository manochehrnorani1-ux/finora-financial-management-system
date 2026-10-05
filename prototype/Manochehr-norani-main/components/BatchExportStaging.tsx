'use client';

import React from 'react';
import DabLicenseRenewalLetter from '@/components/DabLicenseRenewalLetter';
import MeetingMinutes from '@/components/MeetingMinutes';
import OrgChartCanvas from '@/components/OrgChartCanvas';
import DabLicenseRenewalForm from '@/components/DabLicenseRenewalForm';
import DabBranchRenewalForm from '@/components/DabBranchRenewalForm';
import DabGuaranteeForm from '@/components/DabGuaranteeForm';
import DabLicenseRenewalChecklist from '@/components/DabLicenseRenewalChecklist';
import DabBranchRenewalChecklist from '@/components/DabBranchRenewalChecklist';
import CompanyArticles from '@/components/CompanyArticles';
import CompanyProposal from '@/components/CompanyProposal';
import ComplianceReporting from '@/components/ComplianceReporting';

interface BatchExportStagingProps {
  selectedDocIds: string[];
  customLogo?: string | null;
  companyId?: string;
  includeCoverPage?: boolean;
  companyName: string;
  licenseNumber: string;
  issueDate: string;
  selectedDocsMeta?: { id: string; title: string; category: string }[];
}

export default function BatchExportStaging({
  selectedDocIds,
  customLogo,
  companyId = 'default',
  includeCoverPage = true,
  companyName,
  licenseNumber,
  issueDate,
  selectedDocsMeta = [],
}: BatchExportStagingProps) {
  if (!selectedDocIds || selectedDocIds.length === 0) {
    return null;
  }

  return (
    <div
      id="batch-export-staging-container"
      className="hidden print:block bg-white text-slate-900 w-full"
      dir="rtl"
    >
      {/* Cover Page */}
      {includeCoverPage && (
        <div className="min-h-[1050px] flex flex-col justify-between p-12 border-4 border-slate-900 m-4 break-after-page text-center">
          <div className="space-y-4 pt-12">
            <div className="text-sm font-black text-slate-900">د افغانستان بانک</div>
            <div className="text-xs font-bold text-slate-700">آمریت عمومی نظارت از مؤسسات مالی غیر بانکی</div>
            <div className="text-xs font-bold text-slate-700">مدیریت جوازدهی صرافی‌ها و خدمات پولی</div>
          </div>

          <div className="my-16 space-y-6">
            {customLogo && (
              <img
                src={customLogo}
                alt="لوگوی شرکت"
                className="w-28 h-28 mx-auto object-contain mb-6"
              />
            )}
            <h1 className="text-3xl font-black text-slate-950 leading-tight">
              بسته جامع اسناد و فورم‌های رسمی تمدید جواز فعالیت
            </h1>
            <h2 className="text-xl font-bold text-blue-950">
              {companyName}
            </h2>
            <div className="inline-block bg-slate-100 border-2 border-slate-800 px-6 py-2 rounded-xl text-sm font-bold mt-4 font-mono">
              شماره جواز: {licenseNumber}
            </div>
          </div>

          <div className="border-t-2 border-slate-900 pt-8 pb-4 text-xs space-y-2">
            <div>تاریخ تنظیم و صدور: <strong>{issueDate}</strong></div>
            <div className="text-slate-600">تنظیم‌شده بر اساس مقررات و دستورالعمل‌های رسمی د افغانستان بانک (DAB)</div>
          </div>
        </div>
      )}

      {/* Selected Documents */}
      {selectedDocIds.includes('license-renewal-letter') && (
        <div className="break-after-page p-6">
          <DabLicenseRenewalLetter isEditMode={false} customLogo={customLogo} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('meeting-minutes') && (
        <div className="break-after-page p-6">
          <MeetingMinutes isEditMode={false} customLogo={customLogo} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('org-chart') && (
        <div className="break-after-page p-6">
          <OrgChartCanvas isEditMode={false} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('license-renewal') && (
        <div className="break-after-page p-6">
          <DabLicenseRenewalForm isEditMode={false} customLogo={customLogo} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('branch-renewal') && (
        <div className="break-after-page p-6">
          <DabBranchRenewalForm isEditMode={false} customLogo={customLogo} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('guarantee-form') && (
        <div className="break-after-page p-6">
          <DabGuaranteeForm isEditMode={false} customLogo={customLogo} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('license-renewal-checklist') && (
        <div className="break-after-page p-6">
          <DabLicenseRenewalChecklist isEditMode={false} customLogo={customLogo} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('branch-renewal-checklist') && (
        <div className="break-after-page p-6">
          <DabBranchRenewalChecklist isEditMode={false} customLogo={customLogo} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('company-articles') && (
        <div className="break-after-page p-6">
          <CompanyArticles customLogo={customLogo} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('company-proposal') && (
        <div className="break-after-page p-6">
          <CompanyProposal customLogo={customLogo} companyId={companyId} />
        </div>
      )}

      {selectedDocIds.includes('compliance-reporting') && (
        <div className="break-after-page p-6">
          <ComplianceReporting isEditMode={false} customLogo={customLogo} companyId={companyId} />
        </div>
      )}
    </div>
  );
}
