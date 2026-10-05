# DAB Form Route Map

## Canonical form registry

All active DAB form routes use the canonical `DAB_OFFICIAL_FORMS` registry through `DabStandardFormsWorkspace`.

| Route | Canonical form ID | Data preservation |
|---|---|---|
| `/dab-fx-guarantee` | `fx-guarantee` | Existing canonical Firestore records are preserved. |
| `/dab-fx-responsible-employee` | `fx-responsible-employee` | Existing canonical Firestore records are preserved. |
| `/dab-organization-chart` | `organization-chart` | Existing canonical Firestore records are preserved. |
| `/dab-renewal-form-1` | `license-renewal` | Existing canonical Firestore records are preserved. |
| `/dab-renewal` | `license-renewal` | Existing canonical Firestore records are preserved. |
| `/dab-renewal/form-1` | `license-renewal` | Existing canonical Firestore records are preserved. |
| `/dab-shareholder-guarantee` | `shareholder-guarantee` | Existing canonical Firestore records are preserved. |

## Single source of truth

The route layer must not create a second DAB form implementation. The canonical registry is the source for form identity, title, category and official source.

## Data rule

Form IDs remain stable. Existing records under `companies/{companyId}/dabOfficialForms/{formId}` must not be deleted during route or UI consolidation.

## Legacy components

Specialized form components can remain for compatibility and audit history. They must not be used as active DAB route entry points.

## Verification

CI runs both `verify:dab` and `verify:dab-routes` before the production build. This prevents a new active DAB route from bypassing the canonical workspace.
