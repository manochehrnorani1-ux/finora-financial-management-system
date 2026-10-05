'use client';

import './DabOfficialHeader.css';
import DabOfficialHeader from './DabOfficialHeader';
import DabUnifiedOfficialFormsWorkspace from './DabUnifiedOfficialFormsWorkspace';

export default function DabStandardFormsWorkspace() {
  return (
    <div className="dab-standard-forms-shell" dir="rtl">
      <DabOfficialHeader />
      <DabUnifiedOfficialFormsWorkspace />
    </div>
  );
}
