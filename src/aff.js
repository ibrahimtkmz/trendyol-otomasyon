// AFF hakediş + ziyaret: J=kişi, K=marka -> Q=Ziyaretçi, R=Toplam Kazanç (L ve M'ye asla yazılmaz)
const fs = require('fs'), path = require('path');
const L = require('./lib'), S = require('./sheets');
const { CFG, DATA, log, pad, ymd, numTR, fold, sameDay, addDays, notify } = L;
async function search(P, conf, brands, tag) {
  const bf = path.join(DATA, `b_${tag}.txt`);
  fs.writeFileSync(bf, brands.join(';'), 'utf8');
  const out = path.join(DATA, `srch_${tag}.json`); try { fs.unlinkSync(out); } catch {}
  const args = ['-s', conf.serial, '-name', tag, '-brands', bf]; if (conf.back) args.push('-back');
  const go = () => L.runPs(path.join(L.ROOT, 'aff', 'aff_search.ps1'), args, { timeoutMin: CFG.aff.aramaZamanAsimiDk });
  const r = conf.kilit ? await L.withLock('bs4', CFG.aff.kilitBeklemeDk, go) : await go();
  log(`${P} arama bitti (kod ${r.code}): ${r.out.trim().split(/\r?\n/).slice(-2).join(' | ')}`);
  if (/NAVFAIL/.test(r.out)) throw new Error(`${P}: Raporlar > Marka İş Birliklerim ekranına gidilemedi`);
  return L.readJson(out, {});
}
async function run(mode = 'main') {
  const now = new Date(), stf = path.join(DATA, 'aff_durum.json'), st = L.readJson(stf, {});
  if (mode === 'retry') {
    if (!(st.tarih === ymd(now) && st.saat === now.getHours() && st.artis === false)) { log('Tekrar kontrol gerekmiyor', st); return; }
    log(':30 turunda ziyaretçi artışı yoktu, tekrar kontrol ediliyor');
  }
  const id = CFG.aff.sheetId; let tab = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}`;
  { const t = (await S.meta(id)).sheets.map(x => x.properties.title); if (!t.includes(tab)) { log(`"${tab}" sekmesi yok, en son sekme kullanılıyor: ${t[t.length - 1]}`); tab = t[t.length - 1]; } }
  let rows;
  try { rows = await S.get(id, `${S.q(tab)}!A1:S400`, 'UNFORMATTED_VALUE'); }
  catch (e) { throw new Error(`AFF tablosunda "${tab}" sekmesi okunamadı: ${e.message}`); }
  const byP = {}, items = [];
  rows.forEach((r, i) => {
    const pk = fold(String(r[9] || '').trim()).toUpperCase(), brand = String(r[10] || '').trim();
    const conf = CFG.aff.kisiler[pk];
    if (!brand || brand.toUpperCase() === 'MARKA' || !conf || conf.atla) return;
    (byP[pk] = byP[pk] || new Set()).add(brand); items.push({ row: i + 1, pk, person: String(r[9]).trim(), brand, oldQ: numTR(r[16]), oldR: numTR(r[17]) });
  });
  log(`Sekme ${tab}: ${items.length} satır, kişiler: ${Object.keys(byP).join(', ')}`);
  const res = {}, errs = [];
  await Promise.all(Object.entries(byP).map(async ([P, set]) => {
    const conf = CFG.aff.kisiler[P];
    try {
      L.adbConnect(conf.serial);
      if (!L.adbOk(conf.serial)) throw new Error(`${P}: BlueStacks ADB bağlantısı yok (${conf.serial})`);
      let r = await search(P, conf, [...set], P);
      const again = [...set].filter(b => !r[b] || r[b].error === 'nosearchbox');
      if (again.length) { log(`${P}: ${again.length} marka tekrar aranıyor`); Object.assign(r, await search(P, conf, again, P + '2')); }
      res[P] = r;
    } catch (e) { errs.push(e.message); log('HATA', e.message); }
  }));
  const okDay = s => sameDay(s, now) || sameDay(s, addDays(now, -1));
  const data = [], inc = [];
  for (const it of items) {
    const r = res[it.pk]; if (!r) continue;
    const rec = r[it.brand]; let card = null, why = '';
    if (!rec) why = 'sonuç yok';
    else if (rec.error === 'nosearchbox') why = 'arama kutusu bulunamadı';
    else if (rec.error) { card = rec.top || null; if (!card) why = 'kart yok'; }
    else card = rec;
    if (card && !okDay(card.start) && !(CFG.aff.eskiYayindaYaz && !rec.error)) { why = `eski teklif (${card.start})`; card = null; }
    if (!card) { log(`satır ${it.row} ${it.person} ${it.brand}: yazılmadı - ${why}`); continue; }
    const q = numTR(card.visitors), k = numTR(card.kazanc);
    if (q === null) { log(`satır ${it.row} ${it.brand}: ziyaretçi okunamadı`); continue; }
    if (it.oldQ !== null && q < it.oldQ) { log(`satır ${it.row} ${it.brand}: yeni ${q} < mevcut ${it.oldQ}, yazılmadı`); continue; }
    data.push({ range: `${S.q(tab)}!Q${it.row}:R${it.row}`, values: [[q, k === null ? '' : k]] });
    log(`satır ${it.row} ${it.person} ${it.brand} -> ${card.brand} ${card.start} ${card.status} ziyaret=${q} hakediş=${k}`);
    if (it.oldQ === null || q > it.oldQ) inc.push(`${it.person} ${it.brand}: ${it.oldQ ?? '-'} → ${q}${k ? ` (₺${k})` : ''}`);
    else if (k !== null && it.oldR !== null && k > it.oldR) inc.push(`${it.person} ${it.brand}: hakediş ₺${it.oldR} → ₺${k}`);
  }
  await S.update(id, data);
  log(`${data.length} satır yazıldı, ${inc.length} artış`);
  const ziyArtis = inc.some(x => x.includes('→') && !x.includes('hakediş'));
  L.writeJson(stf, { tarih: ymd(now), saat: now.getHours(), artis: ziyArtis, zaman: L.stamp() });
  if (inc.length) notify(`AFF ${tab} güncellendi`, inc.join('\n'));
  if (errs.length) notify('AFF hata', errs.join('\n'));
}
module.exports = { run };
