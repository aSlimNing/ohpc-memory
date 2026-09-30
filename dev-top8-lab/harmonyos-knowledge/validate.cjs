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

// The agent routers have gone stale before (the Skill kept naming a file that had been split up),
// so every path they name is checked here. Paths must be repository-relative so a clone resolves
// them. Only path-like references are checked: a bare file name in prose ("the shared SKILL.md
// convention") names no location.
const repoRoot = path.resolve(root, '..', '..');
const skillDir = path.join(repoRoot, 'skill', 'harmonyos-pc-development');
const referencesDir = path.join(skillDir, 'references');
const agentsFile = path.join(repoRoot, 'AGENTS.md');
const routerFiles = [];
let routerChecked = false;

if (fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
  routerChecked = true;
  routerFiles.push(path.join(skillDir, 'SKILL.md'));
  if (fs.existsSync(referencesDir)) {
    routerFiles.push(...fs.readdirSync(referencesDir).map((name) => path.join(referencesDir, name)));
  }
}
if (fs.existsSync(agentsFile)) routerFiles.push(agentsFile);

for (const routerFile of routerFiles) {
  const label = path.relative(repoRoot, routerFile);
  const content = fs.readFileSync(routerFile, 'utf8');
  for (const [, target] of content.matchAll(/`([^`\s]*\/[^`\s]*\.(?:md|cjs|json|sh))`/g)) {
    if (/^(?:\/|~)/.test(target)) {
      errors.push(`${label}: router path must be repository-relative, got ${target}`);
    } else if (!fs.existsSync(path.resolve(repoRoot, target))) {
      errors.push(`${label}: router points at a missing file ${target}`);
    }
  }
}

if (errors.length) {
  process.stderr.write(`Knowledge validation failed (${errors.length}):\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Knowledge validation passed (${files.length} Markdown files${routerChecked ? ', agent routers checked' : ''}).\n`,
  );
}
