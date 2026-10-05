# DAB License Renewal Requirements

## Scope

This model is for corporate Foreign Exchange Dealers (FXDs) and Money Service Providers (MSPs).

## Official DAB requirements identified

DAB's General Regulation for Money Service Providers and Foreign Exchange Dealers states that the operation license renewal application must be submitted three weeks before expiry. The listed renewal documents include:

1. Original activity license.
2. Receipt for application fee payment.
3. Tax payment receipt or confirmation of no tax liability.
4. Verification of no criminal background of the licensee and employees by the relevant authorities.
5. Three photos of the applicant.
6. Updated information and required documents from the original license application when there are major changes.

The regulation also states that an individual license is valid for one year and may be extended unless DAB decides otherwise. No person may provide money services or foreign exchange dealings with an expired license.

## DAB form families

The current DAB licensing pages identify forms for:

- Application for renewal of an FXD/MSP company license.
- Shareholder/employee identification.
- Branch/representation license renewal.
- Shareholder guarantee form.
- Guarantee letter.
- Branch creation and authorized representative identification.
- Changes to branch information.
- Ownership transfer.
- Business-name change.
- Location change.
- License suspension.
- Business closure.
- AML/CFT policy.
- Organizational chart.
- Employee signature specimens.
- Human resources policy.
- Employee introduction letter.
- Commencement-of-activity letter.
- Supporting-document guidance.

## Application data model

Every renewal application must be an independent record linked to the company and current license. It must support:

- application number
- application date
- license number
- license issue date
- license expiry date
- submission target date
- submission date
- company information snapshot
- shareholders snapshot
- employees snapshot
- branch snapshot
- bank-account information where required by the applicable form
- tax clearance information
- criminal-background verification
- photographs
- guarantees
- supporting documents
- material-change declaration
- DAB correspondence
- review status
- decision

## Important implementation rule

The application must not be considered complete only because all local fields are filled. A compliance engine must check the current DAB source forms and applicable regulation before allowing final submission.

DAB source pages:

- https://dab.gov.af/index.php/Licensing-Guidelines-Forms
- https://www.dab.gov.af/dr/node/1949
- https://dab.gov.af/dr/node/5232
- https://dab.gov.af/sites/default/files/2021-04/NBS%20General%20Regulation%20-%20March%202021%20%282%29_0.pdf
