# DAB license renewal compliance model

## Regulatory source

Da Afghanistan Bank lists the official application form for renewal of a money exchange and money services company license in its licensing forms section.

The current project uses the DAB FXD/MSP Regulation, Article 15, as the legal baseline for renewal requirements. The official DAB publication states that the renewal request is to be submitted at least three weeks before expiry and lists the required supporting documents.

## Article 15 requirements represented by the application

1. Original activity license.
2. Proof of payment of the renewal application fee.
3. Tax payment receipt or certificate of no outstanding tax liability.
4. Criminal-responsibility clearance for the owner and official employees, from competent authorities.
5. Three photographs of the applicant.
6. Updated information and required documents from the initial licensing application when major changes have occurred.
7. Other information requested by Da Afghanistan Bank.

## Important distinction

The regulation distinguishes individual money service providers / exchange dealers from companies. The application data model must therefore not assume that every requirement for an individual applicant is identical to the company workflow. Company renewal must preserve company-specific information such as shareholders, board/management, official employees and branches only where required by the applicable DAB form or instruction.

## Workflow

`draft -> documents_pending -> ready_for_submission -> submitted -> under_dab_review -> additional_information_requested -> approved/rejected -> completed`

A case cannot be marked `ready_for_submission` until all applicable mandatory documents are verified.

## License validity

The regulation states that an individual license is valid for three years and renewable, while a company license issued under the regulation is effective from issuance and has unlimited validity. The application must therefore keep `licenseType` and `validityModel` instead of assuming every license has an expiry date.

## Data model

Each renewal case must be independent and linked to:

- company
- license
- applicant / responsible person
- shareholders where applicable
- official employees where applicable
- branches where applicable
- required documents
- DAB reference and correspondence
- review decisions
- audit history

Sensitive identity and financial documents must not be publicly readable. File content belongs in protected Firebase Storage; Firestore stores metadata and verification state.

## Source links

- https://www.dab.gov.af/dr/node/1949
- https://dab.gov.af/sites/default/files/2020-07/Latest%20MSP%20%26%20FXD%20Regulation.pdf
