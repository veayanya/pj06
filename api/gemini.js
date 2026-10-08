// Pembuat gambar Gemini (Nano Banana). Env: GEMINI_API_KEY, ADMIN_KEY, opsional GEMINI_IMAGE_MODEL.
const crypto = require('crypto');
const MODELS = [process.env.GEMINI_IMAGE_MODEL, 'gemini-3.1-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image'].filter(Boolean);
const hash = v => crypto.createHash('sha256').update(String(v)).digest();

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.GEMINI_API_KEY;
  if (req.method === 'GET') return res.status(200).json({ configured: !!key && !!process.env.ADMIN_KEY });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Metode tidak didukung' }); }
  if (!key) return res.status(503).json({ error: 'GEMINI_API_KEY belum diatur di Vercel' });
  const admin = process.env.ADMIN_KEY || '';
  if (!admin || !crypto.timingSafeEqual(hash(req.headers['x-admin-key'] || ''), hash(admin)))
    return res.status(401).json({ error: 'Kunci admin salah atau ADMIN_KEY belum diatur' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const text = String(b.prompt || '').trim().slice(0, 1500);
    if (!text) return res.status(400).json({ error: 'Deskripsi kosong' });
    const ratio = ['16:9', '1:1', '4:3', '3:4', '9:16'].includes(b.ratio) ? b.ratio : '1:1';
    const parts = [{ text }];
    const m = typeof b.image === 'string' && /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(b.image);
    if (m && m[2].length < 3500000) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    for (const model of MODELS) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: ratio } } })
      });
      if (r.status === 404) continue;
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || ('Gemini HTTP ' + r.status) });
      const ps = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
      const p = ps.find(x => x.inlineData || x.inline_data), d = p && (p.inlineData || p.inline_data);
      if (!d) return res.status(502).json({ error: 'Gemini tidak mengembalikan gambar (mungkin ditolak filter keamanan). Ubah deskripsi.' });
      return res.status(200).json({ image: 'data:' + (d.mimeType || d.mime_type || 'image/png') + ';base64,' + d.data, model });
    }
    return res.status(502).json({ error: 'Model gambar Gemini tidak ditemukan. Atur GEMINI_IMAGE_MODEL di Vercel.' });
  } catch (e) { return res.status(500).json({ error: 'Kesalahan server' }); }
};
