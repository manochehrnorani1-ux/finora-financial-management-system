'use client';

import React from 'react';
import OrgChartCanvas from './OrgChartCanvas';

export default function DabOrganizationChart() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 md:p-8 dir-rtl">
      <OrgChartCanvas isEditMode={true} companyId="default" />
    </div>
  );
}
