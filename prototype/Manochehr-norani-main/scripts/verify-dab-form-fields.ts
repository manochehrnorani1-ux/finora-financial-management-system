import { DAB_OFFICIAL_FORMS } from '../lib/dabOfficialFormRegistry';
import { DAB_OFFICIAL_FORM_FIELDS } from '../lib/dabOfficialFormFieldCatalog';

const missing = DAB_OFFICIAL_FORMS.filter((form) => !DAB_OFFICIAL_FORM_FIELDS[form.id]?.length);
if (missing.length) {
  console.error(`Missing dedicated fields for: ${missing.map((form) => form.id).join(', ')}`);
  process.exit(1);
}

const invalid = Object.entries(DAB_OFFICIAL_FORM_FIELDS).filter(([id, fields]) => {
  const seen = new Set<string>();
  return !DAB_OFFICIAL_FORMS.some((form) => form.id === id) || fields.some((field) => !field.key || !field.label || seen.has(field.key) || !seen.add(field.key));
});

if (invalid.length) {
  console.error(`Invalid DAB field catalog entries: ${invalid.map(([id]) => id).join(', ')}`);
  process.exit(1);
}

console.log(`Verified dedicated field definitions for ${DAB_OFFICIAL_FORMS.length} DAB forms.`);
