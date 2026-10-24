// Trendyol Bonuslu Teklifler taraması (BlueStacks 4) + tabloya yazma + sepet + sıralama + ROAS>2 bildirimi
const fs = require('fs'), path = require('path');
const L = require('./lib'), S = require('./sheets');
const { CFG, DATA, AYLAR, log, numTR, sameDay, addDays, notify, sleep } = L;
const T = CFG.trendyol;
const tabName = d => `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`;
const sh = c => L.adb(T.serial, ['shell', c], 120000);
const dump = () => { try { return sh('uiautomator dump /sdcard/u.xml >/dev/null; cat /sdcard/u.xml'); } catch { return ''; } };
async function top() { for (let i = 0; i < 20; i++) sh('input swipe 450 600 450 1400 150'); await sleep(2000); }
async function scan() {
  L.adbConnect(T.serial);
  if (!L.adbOk(T.serial)) throw new Error(`BlueStacks 4 ADB bağlantısı yok (${T.serial})`);
  await top();
  if (T.siralamaY) { // isteğe bağlı: sıralama sayfasını açıp seçenek seç (eski sortscan.ps1)
    sh('input tap 52 339'); await sleep(3000);
    if (!/Uygula/.test(dump())) { sh('input tap 52 339'); await sleep(3000); }
    sh(`input tap 120 ${T.siralamaY}`); await sleep(2000); sh('input tap 450 1466'); await sleep(5000);
  }
  const x = dump();
  if (!/Marka Tekliflerim/.test(x) || /Genel Sonu/.test(x) || !/Ziyaret.{1,3}iye/.test(x))
    throw new Error('BlueStacks 4 Bonuslu Teklifler listesinde değil. Trendyol uygulamasında Marka Tekliflerim > Bonuslu Teklifler ekranını açık bırakın.');
  await top();
  const tag = L.stamp().replace(/[-: ]/g, '').slice(0, 12);
  for (const f of ['f_new.jsonl', 'f_seen.txt', 'runner.log']) {
    const p = path.join(DATA, f);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(DATA, 'arsiv', `${tag}_${f}`));
    fs.writeFileSync(p, '');
  }
  log('Tarama başladı');
  const r = await L.runPs(path.join(L.ROOT, 'trendyol', 'runner_nf.ps1'), [], { timeoutMin: T.taramaMaxDk, env: { TY_SER: T.serial } });
  const rl = fs.readFileSync(path.join(DATA, 'runner.log'), 'utf8');
  log('Tarama bitti:', rl.trim().split(/\r?\n/).slice(-3).join(' | '), r.out.includes('ZAMAN_ASIMI') ? '(zaman aşımı)' : '');
  const recs = fs.readFileSync(path.join(DATA, 'f_new.jsonl'), 'utf8').split(/\r?\n/)
    .map(l => { try { return JSON.parse(l.replace(/^\uFEFF/, '')); } catch { return null; } }).filter(Boolean);
  return { recs, warn: /NEEDS_ATTENTION/.test(rl) ? 'Tarama yarıda dikkat istedi (NEEDS_ATTENTION), runner.log kontrol edin' : '' };
}
function cleanKom(kom) {
  const ps = []; for (const x of String(kom || '').split('|').map(s => s.trim())) if (x && !ps.includes(x)) ps.push(x);
  const li = a => a.length >= 2 && a[0].includes('Link İçi') && a[1].includes('Link Dışı');
  if (ps.length > 1 && !(ps.length === 2 && li(ps))) return [(li(ps) ? ps.slice(0, 2) : ps.slice(0, 1)).join(' | '), 'Kontrol'];
  return [ps.join(' | '), ''];
}
function cleanKup(kup, brand, brands) {
  const nz = s => s.replace(/ /g, '').toUpperCase(), bn = new Set([...brands].map(nz));
  return String(kup || '').split(' / ').map(s => s.trim()).filter(x => x && !bn.has(nz(x)) && nz(x) !== nz(brand)).join(' / ');
}
const sepetGerekli = (B, C) => B !== null && C !== null && (C >= B / 2 || (C === 500 && B <= 750));
async function ensureTab(id, now) {
  const tab = tabName(now), m = await S.meta(id), sh = m.sheets.map(s => s.properties);
  const f = sh.find(p => p.title === tab); if (f) return { tab, sheetId: f.sheetId };
  for (let k = 1; k <= 10; k++) {
    const prev = sh.find(p => p.title === tabName(addDays(now, -k))); if (!prev) continue;
    const r = await S.batch(id, [{ duplicateSheet: { sourceSheetId: prev.sheetId, newSheetName: tab, insertSheetIndex: 0 } }]);
    const sheetId = r.replies[0].duplicateSheet.properties.sheetId;
    await S.clear(id, `${S.q(tab)}!A2:Z3000`); // yalnızca yeni kopyadaki eski değerler temizlenir; başlık ve biçim kalır
    log(`"${tab}" sekmesi "${prev.title}" kopyalanarak oluşturuldu`);
    return { tab, sheetId };
  }
  throw new Error(`"${tab}" sekmesi yok ve son 10 günün sekmesi de bulunamadı`);
}
const lastRow = rows => { let n = 1; rows.forEach((r, i) => { if (r[0] && String(r[0]).trim()) n = i + 1; }); return n; };
async function sortTab(id, sheetId, tab) {
  const a = await S.get(id, `${S.q(tab)}!A1:A3000`); const Lr = lastRow(a); if (Lr < 3) return;
  const f = []; for (let r = 2; r <= Lr; r++) f.push([`=IF(ISNUMBER(H${r});I${r};-1)`]);
  await S.update(id, [{ range: `${S.q(tab)}!N2:N${Lr}`, values: f }]);
  await S.batch(id, [{ sortRange: { range: { sheetId, startRowIndex: 1, endRowIndex: Lr, startColumnIndex: 0, endColumnIndex: 14 },
    sortSpecs: [{ dimensionIndex: 13, sortOrder: 'DESCENDING' }] } }]);
  await S.clear(id, `${S.q(tab)}!N2:N${Lr}`);
  log(`Sıralandı A2:N${Lr}`);
}
async function run(mode = '') {
  const now = new Date(), id = T.sheetId, msgs = [], errs = [];
  let recs = [];
  if (mode !== 'sadece-sepet') {
    const s = await L.withLock('bs4', T.kilitBeklemeDk, scan); recs = s.recs; if (s.warn) errs.push(s.warn);
  }
  const { tab, sheetId } = await ensureTab(id, now);
  let rows = await S.get(id, `${S.q(tab)}!A1:M3000`);
  // yeni satırlar: bugün başlayan, ty.gl linkine göre tekil
  const links = new Set(rows.slice(1).map(r => r[6]).filter(Boolean)), seen = new Set(), brands = new Set(recs.map(d => String(d.brand || '').trim().toUpperCase()));
  const junk = new RegExp(`^\\d+ (${AYLAR.join('|')})|^Tüm Teklifler`);
  let n = lastRow(rows) + 1; const start = n, out = [];
  for (const d of recs) {
    if (!d.link || !d.brand || junk.test(d.brand) || !sameDay(d.period, now) || links.has(d.link) || seen.has(d.link)) continue;
    seen.add(d.link);
    const [kom, flag] = cleanKom(d.kom), V = d.V, B = d.B, N = d.N ?? null, Sz = d.S || 0;
    let s = B < 750 ? 'Bonus<750' : B < V ? 'Bonus<V' : (N === null || !(Sz < N * V / 2)) ? 'Kota dolu' : 'Uygun'; if (flag) s += ' / Kontrol';
    const f = `=(((H${n}/1,2)*(VALUE(REGEXEXTRACT(D${n};"%\\s*(\\d+)"))/100))+C${n})/((B${n}*0,25)+H${n})`;
    out.push([d.brand, V, B, kom, d.period, d.g || '', d.link, '', f, N === null ? '' : N, Sz, cleanKup(d.kup, d.brand, brands), s]); n++;
  }
  if (out.length) {
    await S.update(id, [{ range: `${S.q(tab)}!A${start}:M${start + out.length - 1}`, values: out }]);
    log(`${out.length} yeni teklif yazıldı (satır ${start}-${start + out.length - 1})`);
    msgs.push(`${out.length} yeni teklif: ${out.map(r => r[0]).join(', ')}`);
    rows = await S.get(id, `${S.q(tab)}!A1:M3000`);
  } else log('Yeni teklif yok');
  // sepet: H boş + kural
  const todo = [];
  rows.forEach((r, i) => { if (i && r[0] && r[6] && !String(r[7] || '').trim() && sepetGerekli(numTR(r[1]), numTR(r[2]))) todo.push({ row: i + 1, link: r[6], brand: r[0] }); });
  let wrote = 0;
  if (todo.length) {
    log(`Sepet hesaplanacak: ${todo.length}`);
    const res = await require('./sepet').computeMany(todo.slice(0, T.sepetMax));
    const data = [];
    for (const t of todo) { const v = res[t.link]; if (v && v.tutar !== undefined) data.push({ range: `${S.q(tab)}!H${t.row}`, values: [[v.tutar]] }); else if (v && v.hata) errs.push(`Sepet ${t.brand}: ${v.hata}`); }
    await S.update(id, data); wrote = data.length; log(`${wrote} sepet tutarı yazıldı`);
    if (res.__fatal) errs.push(res.__fatal);
  }
  if (out.length || wrote) await sortTab(id, sheetId, tab);
  // ROAS > 2 (daha önce bildirilmeyenler)
  const vals = await S.get(id, `${S.q(tab)}!A1:I3000`, 'UNFORMATTED_VALUE');
  const nf = path.join(DATA, 'roas_bildirilen.json'), done = L.readJson(nf, {}), yeni = [];
  for (const r of vals.slice(1)) if (typeof r[7] === 'number' && typeof r[8] === 'number' && r[8] > 2) {
    const k = `${tab}|${r[6]}`; if (!done[k]) { done[k] = 1; yeni.push(`${r[0]} ROAS ${r[8].toFixed(2).replace('.', ',')} (sepet ${r[7]})`); }
  }
  L.writeJson(nf, done);
  if (yeni.length) msgs.push('ROAS > 2: ' + yeni.join('; '));
  if (msgs.length) notify(`Trendyol ${tab}`, msgs.join('\n'));
  if (errs.length) notify('Trendyol uyarı/hata', errs.join('\n'));
}
module.exports = { run };
