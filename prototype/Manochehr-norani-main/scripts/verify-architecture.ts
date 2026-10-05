import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const violations: string[] = [];

const checks = [
  {
    path: 'app/layout.tsx',
    required: ['AuthProvider', 'CompanyProvider'],
  },
  {
    path: 'lib/dabOfficialFormRegistry.ts',
    required: [],
  },
  {
    path: 'scripts/verify-dab-routes.ts',
    required: ['DabStandardFormsWorkspace'],
  },
];

for (const check of checks) {
  const file = join(process.cwd(), check.path);
  if (!existsSync(file)) {
    violations.push(`Missing required architecture file: ${check.path}`);
    continue;
  }

  const source = readFileSync(file, 'utf8');
  for (const token of check.required) {
    if (!source.includes(token)) {
      violations.push(`${check.path} must contain ${token}`);
    }
  }
}

if (violations.length > 0) {
  console.error('[architecture] Verification failed:');
  for (const violation of violations) console.error(` - ${violation}`);
  process.exit(1);
}

console.log('[architecture] OK: required providers and canonical DAB architecture are present.');
