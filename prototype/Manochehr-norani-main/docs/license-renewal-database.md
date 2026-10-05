# License Renewal Database

## Purpose

This document defines the data model for the DAB license renewal workflow.

## Company

- Company identity and legal information.
- Current and historical licenses.
- Branches.
- Shareholders.
- Personnel and responsible officers.
- Bank accounts.
- Regulatory documents.

## Renewal application

Each renewal is an independent record linked to one company and one license.

Recommended fields:

- `applicationId`
- `companyId`
- `licenseId`
- `applicationNo`
- `applicationDate`
- `status`
- `submittedAt`
- `approvedAt`
- `rejectedAt`
- `notes`
- `createdAt`
- `updatedAt`

## Renewal checklist

Checklist records are linked to the renewal application. Each item stores:

- requirement text
- status: `pending`, `submitted`, `verified`, `rejected`, `not_applicable`
- note
- document references
- verification date
- verifier

## Documents

Documents are linked to the company and, when applicable, to a renewal application.

Store metadata only in Firestore. File content must use protected Firebase Storage.

Recommended metadata:

- document type
- document number
- issue date
- expiry date
- storage path
- verification status
- verified by
- verified at
- checksum
- created at

## Security rules

All company data must be authenticated. Company-scoped records must be accessible only to users who belong to that company. Administrative access must be explicit. Public read/write access is not allowed for company, employee, personnel, compliance, regulatory, renewal, or document data.

## Audit

Important actions must create append-only audit records:

- create
- update
- delete
- document upload
- document verification
- checklist verification
- application submission
- application approval/rejection

Audit records should contain the actor UID, company ID, action, resource path, timestamp, and a short before/after summary where appropriate.
