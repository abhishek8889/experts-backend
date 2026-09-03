import { existsSync } from 'node:fs';
import * as path from 'node:path';

export function resolveI18nPath() {
  const candidates = [
    path.join(__dirname, 'i18n'),
    path.join(__dirname, '..', 'i18n'),
    path.join(process.cwd(), 'src', 'i18n'),
    path.join(process.cwd(), 'dist', 'i18n'),
    path.join(process.cwd(), 'dist', 'src', 'i18n'),
  ];

  return (
    candidates.find((candidate) => existsSync(candidate)) ??
    path.join(process.cwd(), 'src', 'i18n')
  );
}
