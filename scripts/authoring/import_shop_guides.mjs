import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Imports educational content only; shop accounts, orders and access settings stay outside the app.
const source = path.resolve(process.argv[2] || 'build/authoring/shop-source/products');
const destination = path.resolve('public/postop/guides');
const catalog = JSON.parse(await readFile(path.join(source, 'catalog.json'), 'utf8'));
const ids = ['acl', 'meniscus', 'acl-meniscus', 'pcl', 'patellar-dislocation', 'achilles-rupture'];
const documents = [];
const files = new Map();
for (const id of ids) {
  const item = catalog[id];
  if (!item?.published) throw new Error(`Source document is not published: ${id}`);
  const htmlPath = path.join(source, id, 'full.html');
  const html = await readFile(htmlPath, 'utf8');
  files.set(`${id}/full.html`, htmlPath);
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const reference = match[1];
    if (/^(?:#|data:|https?:|\/\/)/i.test(reference)) continue;
    const relative = decodeURIComponent(reference.split(/[?#]/)[0]);
    const resolved = path.resolve(source, id, relative);
    if (!resolved.startsWith(`${source}${path.sep}`)) throw new Error(`Asset escapes source: ${relative}`);
    files.set(path.relative(source, resolved).replaceAll('\\', '/'), resolved);
  }
  documents.push({ id, title: item.card_title, name: item.name, category: id === 'achilles-rupture' ? '足踝' : '膝关节',
    scope: item.card_meta.split(' · ').slice(1).join(' · '), summary: item.card_summary,
    chapters: item.chapters, file: `postop/guides/${id}/full.html` });
}
const manifest = [];
for (const [relative, original] of files) {
  const target = path.join(destination, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(original, target);
  const bytes = await readFile(target);
  manifest.push({ file: `public/postop/guides/${relative}`, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') });
}
await mkdir('src/content', { recursive: true });
await writeFile('src/content/postop-catalog.json', JSON.stringify(documents, null, 2) + '\n');
await writeFile('docs/POSTOP_IMPORT_MANIFEST.json', JSON.stringify({
  source: '66.154.101.204:/opt/rehabguide/products', importedAt: new Date().toISOString(),
  policy: 'Published lower-limb postoperative-related full HTML and referenced assets copied without rewriting.',
  excluded: ['lumbar-disc: unpublished, outside lower-limb scope', 'ankle-sprain: unpublished', 'muscle-strain: unpublished, nonsurgical'],
  documents: ids, files: manifest,
}, null, 2) + '\n');
console.log(`Imported ${documents.length} documents and ${manifest.length} files.`);
