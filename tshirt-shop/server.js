const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- tiny JSON "database" ----------
function seed() {
  const mk = (name, price, color, desc) => ({
    id: crypto.randomUUID(), name, price, color, description: desc,
    image: '', visible: true, createdAt: new Date().toISOString(),
    stock: { XS: 5, S: 10, M: 10, L: 10, XL: 5, XXL: 2 },
  });
  return {
    products: [
      mk('Classic Black Tee', 20, '#1f1f1f', 'Heavyweight 100% cotton. Goes with everything.'),
      mk('Ocean Blue Tee', 22, '#2563eb', 'Soft-washed cotton in a deep ocean blue.'),
      mk('Sunset Orange Tee', 22, '#f97316', 'Bright, bold and garment-dyed.'),
    ],
    orders: [],
  };
}
function load() {
  if (!fs.existsSync(DB_FILE)) save(seed());
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function save(db) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// ---------- auth (signed cookie) ----------
const sign = (v) => v + '.' + crypto.createHmac('sha256', SECRET).update(v).digest('hex');
function isAdmin(req) {
  const m = /(?:^|;\s*)admin=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const val = decodeURIComponent(m[1]);
  const [ts] = val.split('.');
  const expected = sign(ts);
  if (val.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(val), Buffer.from(expected))) return false;
  return Date.now() - Number(ts) < 1000 * 60 * 60 * 12; // 12h session
}
const requireAdmin = (req, res, next) => (isAdmin(req) ? next() : res.status(401).json({ error: 'Not logged in' }));

// ---------- validation ----------
function cleanProduct(body, existing = {}) {
  const p = { ...existing };
  if (body.name !== undefined) p.name = String(body.name).trim().slice(0, 100);
  if (body.description !== undefined) p.description = String(body.description).slice(0, 2000);
  if (body.color !== undefined) p.color = /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : '#cccccc';
  if (body.price !== undefined) p.price = Math.max(0, Math.round(Number(body.price) * 100) / 100) || 0;
  if (body.visible !== undefined) p.visible = body.visible === true || body.visible === 'true';
  if (body.stock !== undefined) {
    const s = typeof body.stock === 'string' ? JSON.parse(body.stock) : body.stock;
    p.stock = Object.fromEntries(SIZES.map((sz) => [sz, Math.max(0, parseInt(s[sz], 10) || 0)]));
  }
  if (!p.name) throw new Error('Name is required');
  return p;
}

// ---------- app ----------
const app = express();
app.use(express.json());
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)),
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

// public API
app.get('/api/products', (_req, res) => {
  res.json(load().products.filter((p) => p.visible));
});
app.get('/api/products/:id', (req, res) => {
  const p = load().products.find((x) => x.id === req.params.id && x.visible);
  p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/orders', (req, res) => {
  const db = load();
  const { items, customer } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty' });
  if (!customer?.name || !customer?.email) return res.status(400).json({ error: 'Name and email required' });
  const lines = [];
  for (const it of items) {
    const p = db.products.find((x) => x.id === it.id && x.visible);
    const qty = parseInt(it.qty, 10);
    if (!p || !SIZES.includes(it.size) || !(qty > 0)) return res.status(400).json({ error: 'Invalid item in cart' });
    if ((p.stock[it.size] || 0) < qty) return res.status(400).json({ error: `Not enough stock: ${p.name} (${it.size})` });
    lines.push({ p, size: it.size, qty });
  }
  lines.forEach(({ p, size, qty }) => (p.stock[size] -= qty));
  const order = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toISOString(),
    customer: { name: String(customer.name).slice(0, 100), email: String(customer.email).slice(0, 200), address: String(customer.address || '').slice(0, 500) },
    items: lines.map(({ p, size, qty }) => ({ productId: p.id, name: p.name, size, qty, price: p.price })),
    total: lines.reduce((s, { p, qty }) => s + p.price * qty, 0),
    status: 'new',
  };
  db.orders.unshift(order);
  save(db);
  res.json(order);
});

// admin API
app.post('/api/admin/login', (req, res) => {
  const pw = String(req.body?.password || '');
  const a = crypto.createHash('sha256').update(pw).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Wrong password' });
  res.setHeader('Set-Cookie', `admin=${encodeURIComponent(sign(String(Date.now())))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);
  res.json({ ok: true });
});
app.post('/api/admin/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/admin/me', (req, res) => res.json({ loggedIn: isAdmin(req) }));

app.get('/api/admin/products', requireAdmin, (_req, res) => res.json(load().products));
app.post('/api/admin/products', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const db = load();
    const p = cleanProduct(req.body, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), image: '', visible: true, stock: {} });
    if (req.file) p.image = '/uploads/' + req.file.filename;
    db.products.push(p);
    save(db);
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const db = load();
    const i = db.products.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Not found' });
    const p = cleanProduct(req.body, db.products[i]);
    if (req.file) { removeImage(db.products[i].image); p.image = '/uploads/' + req.file.filename; }
    if (req.body.removeImage === 'true' && !req.file) { removeImage(p.image); p.image = ''; }
    db.products[i] = p;
    save(db);
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const db = load();
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  removeImage(p.image);
  db.products = db.products.filter((x) => x !== p);
  save(db);
  res.json({ ok: true });
});
app.get('/api/admin/orders', requireAdmin, (_req, res) => res.json(load().orders));
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const db = load();
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (['new', 'paid', 'shipped', 'cancelled'].includes(req.body?.status)) o.status = req.body.status;
  save(db);
  res.json(o);
});

function removeImage(img) {
  if (img && img.startsWith('/uploads/')) fs.rm(path.join(UPLOAD_DIR, path.basename(img)), () => {});
}

app.use((err, _req, res, _next) => res.status(400).json({ error: err.message }));

app.listen(PORT, () => {
  console.log(`Shop:  http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin/`);
  if (ADMIN_PASSWORD === 'changeme') console.log('WARNING: using default admin password "changeme". Set ADMIN_PASSWORD.');
});
