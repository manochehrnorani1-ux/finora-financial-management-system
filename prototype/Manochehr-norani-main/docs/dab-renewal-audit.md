# DAB Renewal Audit

## Scope

This audit covers the DAB license-renewal form, the renewal compliance panel, and Firestore access used by those screens.

## Findings

### 1. Renewal form used a global settings path

The renewal form stores its data under `settings/license_renewal_form_v1_<companyId>`. The previous global settings rule allowed writes only for administrators. This could prevent a normal company user from saving a renewal case.

### 2. Compliance panel used a global settings path

The compliance panel stores its data under `settings/dab_renewal_compliance_v1_<companyId>`. It also required administrator write access under the previous rule.

### 3. Company isolation was required

Renewal data contains sensitive company information. Access must be limited to an administrator or the company identified by the authenticated user's `companyId` claim.

## Changes

The Firestore settings rules now allow access to the two renewal settings documents only when the authenticated user's `companyId` matches the company suffix in the document ID, or when the user is an administrator. Other global settings remain administrator-only.

The existing company-scoped collection rule remains protected by the same company check.

## Compliance workflow

The renewal requirements engine remains the source of truth for mandatory documents. A renewal is ready only when all applicable mandatory records have status `verified`.

The current UI still uses a status selector for the document state. A later implementation should replace manual verification with a protected document-upload and reviewer workflow so that a user cannot self-verify evidence without an actual stored document and reviewer identity.
