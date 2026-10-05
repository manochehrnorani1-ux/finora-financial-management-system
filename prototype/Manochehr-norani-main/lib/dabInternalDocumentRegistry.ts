/**
 * Internal document registry.
 *
 * These documents are used by the application for company operations.
 * They are not presented as official DAB forms.
 */

export type DabInternalDocumentCategory =
  | 'organization'
  | 'human-resources'
  | 'employee-records'
  | 'internal-correspondence';

export interface DabInternalDocumentDefinition {
  id: string;
  title: string;
  category: DabInternalDocumentCategory;
  official: false;
}

export const DAB_INTERNAL_DOCUMENTS: readonly DabInternalDocumentDefinition[] = [
  {
    id: 'organization-chart',
    title: 'تشکیلاتی چارت',
    category: 'organization',
    official: false,
  },
  {
    id: 'employee-signature-samples',
    title: 'نمونه امضای کارکنان شرکت',
    category: 'employee-records',
    official: false,
  },
  {
    id: 'hr-policy',
    title: 'پالیسی منابع بشری',
    category: 'human-resources',
    official: false,
  },
  {
    id: 'employee-introduction-letter',
    title: 'مکتوب معرفی کارکنان',
    category: 'internal-correspondence',
    official: false,
  },
];

export const DAB_INTERNAL_DOCUMENT_BY_ID = Object.fromEntries(
  DAB_INTERNAL_DOCUMENTS.map((document) => [document.id, document]),
) as Record<string, DabInternalDocumentDefinition>;
