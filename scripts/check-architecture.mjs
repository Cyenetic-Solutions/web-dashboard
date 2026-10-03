import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
const roots = ["app", "components", "features", "providers", "services"];
const failures = [];
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (!/\.tsx?$/.test(file)) continue;
    const source = await readFile(file, 'utf8');
    if (source.split('\n').length > 250) failures.push(`${file}: exceeds 250 lines`);
    const syntax = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function inspect(node) {
      if (node.kind === ts.SyntaxKind.AnyKeyword) failures.push(`${file}: explicit any type`);
      ts.forEachChild(node, inspect);
    }
    inspect(syntax);
    if (/@ts-ignore/.test(source)) failures.push(`${file}: unsafe typing escape`);
    if (file.startsWith('components/') && /from ['"]@\/features\//.test(source)) failures.push(`${file}: shared component imports feature`);
    if ((file.startsWith('app/') || file.startsWith('features/') || file.startsWith('components/')) && /\bfetch\s*\(/.test(source)) failures.push(`${file}: transport belongs in services`);
    if (file.startsWith('app/api/')) failures.push(`${file}: backend routes belong in the API repository`);
    const domain = file.match(/^features\/([^/]+)\//)?.[1];
    for (const match of source.matchAll(/from ['"]@\/features\/([^/]+)/g)) {
      if (domain && domain !== match[1]) failures.push(`${file}: cross-feature import`);
    }
  }
}
for (const root of roots) await scan(root);
if (failures.length) { process.stderr.write(failures.join('\n') + '\n'); process.exit(1); }
process.stdout.write('Architecture boundaries passed.\n');
