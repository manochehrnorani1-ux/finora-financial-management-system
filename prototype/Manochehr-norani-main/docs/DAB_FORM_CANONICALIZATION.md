# DAB Form Canonicalization

## Canonicalization policy

The application shall use one canonical implementation per DAB form while preserving the complete required content of the source form.

### Safe consolidation

1. Identify all implementations of the same DAB form.
2. Compare their complete content.
3. Select the implementation that can preserve the complete content and the official source reference.
4. Move any missing content into the canonical implementation.
5. Update routes to the canonical implementation.
6. Verify the result.
7. Only then remove an unused duplicate implementation.

### Prohibited action

Do not delete or shorten a form because two forms have similar names or overlapping fields.

### Verification

Every consolidation must pass the repository DAB verification and production checks before merge.
