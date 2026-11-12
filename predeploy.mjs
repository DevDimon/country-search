import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, 'dist');

cpSync(resolve(root, 'index.html'), resolve(dist, 'index.html'));
cpSync(resolve(root, 'styles.css'), resolve(dist, 'styles.css'));

const indexPath = resolve(dist, 'index.html');
const html = readFileSync(indexPath, 'utf8').replaceAll(
  './dist/ui/main.js',
  './ui/main.js',
);
writeFileSync(indexPath, html);