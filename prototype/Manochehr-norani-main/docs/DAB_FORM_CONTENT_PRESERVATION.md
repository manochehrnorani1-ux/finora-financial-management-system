# DAB Form Content Preservation

## Purpose

This document defines the repository rule for Da Afghanistan Bank (DAB) forms.

## Mandatory rules

- Keep all existing form fields and required information.
- Keep the official DAB source reference for each form.
- Use one canonical implementation for each form.
- Merge duplicate implementations only after their content is compared.
- Do not remove a field only because another form contains a similar field.
- Preserve legacy routes when they are required by the application. Redirect them to the canonical implementation when possible.
- Remove code only when it is confirmed to be duplicate and unused.
- Run the DAB registry, DAB route, architecture, lint, type-check, and production build checks after structural changes.

## Review rule

A form is ready for consolidation only when its title, sections, fields, required documents, declarations, validation rules, source reference, and output behavior have been checked against the canonical form.

No content is considered disposable during deduplication without an explicit comparison.
