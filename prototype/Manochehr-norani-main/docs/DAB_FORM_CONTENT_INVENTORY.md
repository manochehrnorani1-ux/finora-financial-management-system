# DAB Form Content Inventory

This file is the controlled inventory for the DAB form consolidation audit.

## Status

- Main branch content is not modified by this audit branch.
- No DAB form content is removed by the audit documentation.
- Form consolidation requires content comparison before implementation.
- The canonical registry remains the source of application form routing.

## Required comparison

For each DAB form, compare the current implementation with the official DAB form and record:

1. Title.
2. Sections.
3. Fields.
4. Required documents.
5. Declarations.
6. Validation rules.
7. Official source.
8. Application route.
9. Export or print behavior.
10. Duplicate implementation status.

## Merge gate

Do not delete a form implementation until the comparison confirms that all required content is available in the canonical implementation and that the old implementation is no longer required.
