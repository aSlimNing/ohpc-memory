const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const files = fs.readdirSync(root).filter((name) => name.endsWith('.md')).sort();
const ids = new Set();
const errors = [];

for (const name of files) {
  const filePath = path.join(root, name);
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!frontmatter) {
    errors.push(`${name}: missing YAML frontmatter`);
    continue;
  }

  const id = frontmatter[1].match(/^id:\s*([a-z0-9-]+)\s*$/m)?.[1];
  const reviewedOn = frontmatter[1].match(/^reviewed_on:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1];

  if (!id) errors.push(`${name}: missing valid id`);
  else if (ids.has(id)) errors.push(`${name}: duplicate id ${id}`);
  else ids.add(id);
  if (!reviewedOn || Number.isNaN(Date.parse(reviewedOn))) errors.push(`${name}: missing valid reviewed_on date`);
  if (/\bTODO:/.test(content)) errors.push(`${name}: unresolved TODO marker`);

  for (const [, target] of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^(?:https?:|mailto:)/.test(target)) continue;
    const localPath = target.split('#', 1)[0];
    if (!localPath) continue;
    if (!fs.existsSync(path.resolve(root, localPath))) errors.push(`${name}: broken link ${target}`);
  }
}

if (!files.includes('INDEX.md')) errors.push('INDEX.md is missing');
if (!files.includes('maintenance.md')) errors.push('maintenance.md is missing');

if (errors.length) {
  process.stderr.write(`Knowledge validation failed (${errors.length}):\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Knowledge validation passed (${files.length} Markdown files).\n`);
}
