// İzleme paneli: node src/panel.js  ->  http://127.0.0.1:3939  (sadece okur; "Şimdi başlat" zamanlanmış görevi tetikler)
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process');
const L = require('./lib'), S = require('./sheets');
const { CFG, LOGS, DATA, ROOT, AYLAR, pad, ymd } = L;
const PORT = 3939;
const tail = (f, n) => { try { return fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(x => x.trim()).slice(-n); } catch { return []; } };
let dC = { t: 0, v: null };
function durum() {
  if (dC.v && Date.now() - dC.t < 4000) return Promise.resolve(dC.v);
  return new Promise(res => cp.execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'panel_durum.ps1')],
    { windowsHide: true, encoding: 'utf8', timeout: 20000 }, (e, out) => {
      const v = { gorevler: [], surecler: [] };
      try { const j = JSON.parse(String(out).trim().replace(/^\uFEFF/, '')); v.gorevler = [].concat(j.gorevler || []).filter(Boolean); v.surecler = [].concat(j.surecler || []).filter(Boolean); } catch { v.hata = 'Durum okunamadı'; }
      dC = { t: Date.now(), v }; res(v);
    }));
}
let sC = { t: 0, v: null };
async function tablolar(force) {
  if (!force && sC.v && Date.now() - sC.t < 60000) return sC.v;
  const now = new Date(), v = {};
  try {
    const id = CFG.trendyol.sheetId, tab = `${now.getDate()} ${AYLAR[now.getMonth()]} ${now.getFullYear()}`;
    const rows = await S.get(id, `${S.q(tab)}!A1:M500`);
    v.trendyol = { tab, baslik: rows[0] || [], satirlar: rows.slice(1).filter(r => r.some(c => String(c).trim())) };
  } catch (e) { v.trendyol = { hata: e.message }; }
  try {
    const id = CFG.aff.sheetId, t = (await S.meta(id)).sheets.map(s => s.properties.title);
    let tab = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}`; if (!t.includes(tab)) tab = t[t.length - 1];
    const rows = await S.get(id, `${S.q(tab)}!A1:S400`), out = [];
    rows.forEach((r, i) => {
      const pk = L.fold(String(r[9] || '').trim()).toUpperCase(), b = String(r[10] || '').trim();
      if (!b || b.toUpperCase() === 'MARKA' || !CFG.aff.kisiler[pk]) return;
      out.push({ satir: i + 1, kisi: String(r[9]).trim(), marka: b, L: r[11] || '', M: r[12] || '', Q: r[16] || '', R: r[17] || '' });
    });
    v.aff = { tab, satirlar: out };
  } catch (e) { v.aff = { hata: e.message }; }
  v.zaman = L.stamp(); sC = { t: Date.now(), v }; return v;
}
function bildirimler() {
  let t = ''; try { t = fs.readFileSync(path.join(LOGS, 'bildirimler.txt'), 'utf8'); } catch {}
  return t.slice(-8000).split(/\r?\n(?=\[\d{4}-\d\d-\d\d )/).map(x => x.trim()).filter(x => /^\[\d{4}/.test(x)).slice(-15).reverse();
}
async function hepsi(force) {
  const d = await durum(), today = ymd();
  const loglar = {}; for (const n of ['trendyol', 'aff', 'genel']) loglar[n] = tail(path.join(LOGS, `${n}_${today}.log`), 200);
  const aktif = d.surecler.map(p => { const m = /main\.js"?\s+(\w+)\s*(\w*)/.exec(p.cmd || '') || []; const is = m[1] || '?';
    return { is, mod: m[2] || '', pid: p.pid, bas: p.bas, son: (loglar[is === 'aff' ? 'aff' : is === 'trendyol' ? 'trendyol' : 'genel'] || []).slice(-1)[0] || '' }; });
  const sepet = loglar.trendyol.filter(l => /Sepet|sepet/.test(l));
  return { zaman: L.stamp(), durum: d, aktif, loglar, sepet, bildirimler: bildirimler(), onbellek: L.readJson(path.join(DATA, 'sepet_onbellek.json'), {}), tablolar: await tablolar(force) };
}
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname === '/api/hepsi') { const j = await hepsi(u.searchParams.get('yenile') === '1'); res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify(j)); }
    if (u.pathname === '/api/baslat' && req.method === 'POST') {
      const ad = u.searchParams.get('is') === 'aff' ? 'AFF' : 'Trendyol';
      cp.execFile('powershell.exe', ['-NoProfile', '-Command', `Start-ScheduledTask -TaskPath '\\Otomasyon\\' -TaskName '${ad}'`], { windowsHide: true }, () => {});
      dC.t = 0; res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, ad }));
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(__dirname, 'panel.html'), 'utf8'));
  } catch (e) { res.writeHead(500); res.end(String(e.message)); }
}).on('error', e => { if (e.code === 'EADDRINUSE') { console.log('Panel zaten açık'); process.exit(0); } throw e; })
  .listen(PORT, '127.0.0.1', () => console.log(`Panel: http://127.0.0.1:${PORT}`));