import express from 'express';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 18990);
const DATA_FILE = path.join(__dirname, 'data', 'items.json');

// ---- persistence layer (JSON file, survives restart) ----
function loadItems() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[load] failed:', err.message);
    return [];
  }
}
function saveItems(items) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE); // atomic-ish write
}

let items = loadItems();

const app = express();
app.use(express.json());

// ---- API ----
app.get('/api/items', (req, res) => {
  res.json({ ok: true, count: items.length, items });
});

app.post('/api/items', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ ok: false, error: 'name is required' });
  const item = {
    id: nanoid(10),
    name,
    createdAt: new Date().toISOString(),
  };
  items.push(item);
  saveItems(items);
  res.status(201).json({ ok: true, item, count: items.length });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, pid: process.pid, platform: process.platform, node: process.version });
});

// ---- static frontend ----
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`[server] listening on http://127.0.0.1:${PORT} pid=${process.pid} items_loaded=${items.length}`);
});
