import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readData<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'public', 'data', path), 'utf8')) as T;
}
