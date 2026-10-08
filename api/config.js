// Penyimpanan pengaturan bersama (Upstash Redis / Vercel KV lewat REST API).
// Env: KV_REST_API_URL + KV_REST_API_TOKEN (atau UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN), ADMIN_KEY.
const crypto = require('crypto');

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const META_KEY = 'sertifikat:meta';
const IMG_PREFIX = 'sertifikat:img:';
const IMG_NAMES = ['template', 'tte', 'logo0', 'logo1', 'logo2', 'logo3'];
const MAX_LEN = 1000000;

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || 'redis error');
  return j.result;
}

function authorized(req) {
  const expected = process.env.ADMIN_KEY || '';
  if (!expected) return false;
  const given = String(req.headers['x-admin-key'] || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ configured: false });
  try {
    if (req.method === 'GET') {
      const img = req.query && req.query.img;
      if (img) {
        if (!IMG_NAMES.includes(img)) return res.status(400).json({ error: 'Nama gambar tidak valid' });
        const data = await redis(['GET', IMG_PREFIX + img]);
        return res.status(200).json({ data: data || null });
      }
      const raw = await redis(['GET', META_KEY]);
      if (!raw) return res.status(200).json({ configured: true, config: null, images: [] });
      const parsed = JSON.parse(raw);
      return res.status(200).json({ configured: true, config: parsed.config || null, images: parsed.images || [] });
    }

    if (req.method === 'POST') {
      if (!authorized(req)) return res.status(401).json({ error: 'Kunci admin salah atau ADMIN_KEY belum diatur di Vercel' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      if (body.part === 'img') {
        if (!IMG_NAMES.includes(body.name)) return res.status(400).json({ error: 'Nama gambar tidak valid' });
        const key = IMG_PREFIX + body.name;
        if (body.data === null) { await redis(['DEL', key]); return res.status(200).json({ ok: true }); }
        if (typeof body.data !== 'string' || !/^data:image\/(png|jpeg|webp|gif);base64,/.test(body.data))
          return res.status(400).json({ error: 'Format gambar tidak valid' });
        if (body.data.length > MAX_LEN) return res.status(413).json({ error: 'Gambar ' + body.name + ' terlalu besar' });
        await redis(['SET', key, body.data]);
        return res.status(200).json({ ok: true });
      }

      if (body.part === 'meta') {
        const d = body.data;
        if (!d || typeof d !== 'object' || !d.config || typeof d.config !== 'object')
          return res.status(400).json({ error: 'Data tidak valid' });
        const images = Array.isArray(d.images) ? d.images.filter(n => IMG_NAMES.includes(n)) : [];
        const value = JSON.stringify({ config: d.config, images });
        if (value.length > MAX_LEN) return res.status(413).json({ error: 'Pengaturan terlalu besar' });
        await redis(['SET', META_KEY, value]);
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'Permintaan tidak dikenali' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Metode tidak didukung' });
  } catch (e) {
    return res.status(500).json({ error: 'Kesalahan server' });
  }
};
