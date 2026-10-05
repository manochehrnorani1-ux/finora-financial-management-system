import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'app');
const CANONICAL_IMPORTS = new Set([
  '@/components/DabStandardFormsWorkspace',
  '@/components/DabShareholderGuaranteeStandardForm',
  '@/components/DabLicenseRenewalOfficialForm',
  '@/components/DabOrganizationChartStandardForm',
]);

function collectPageFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) files.push(...collectPageFiles(fullPath));
    else if (entry === 'page.tsx' || entry === 'page.ts') files.push(fullPath);
  }
  return files;
}

const dabPages = collectPageFiles(ROOT).filter((file) => file.includes('/dab-'));
const violations: string[] = [];

for (const file of dabPages) {
  const source = readFileSync(file, 'utf8');
  const imports = [...source.matchAll(/from ['\"](@\/components\/[^'\"]+)['\"]/g)].map((match) => match[1]);
  const dabFormImports = imports.filter((path) => path.startsWith('@/components/Dab') && path.endsWith('Form'));
  const hasCanonicalImport = imports.some((path) => CANONICAL_IMPORTS.has(path));
  const hasLegacyImport = dabFormImports.some((path) => !CANONICAL_IMPORTS.has(path));

  if (hasLegacyImport && !hasCanonicalImport) {
    violations.push(file.replace(`${process.cwd()}/`, ''));
  }
}

if (violations.length > 0) {
  console.error('[DAB routes] Legacy form route detected:');
  for (const file of violations) console.error(` - ${file}`);
  process.exit(1);
}

console.log(`[DAB routes] OK: ${dabPages.length} DAB route pages pass canonical workspace checks.`);
