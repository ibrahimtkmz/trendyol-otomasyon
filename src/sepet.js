// Sepet tutarı (Playwright, kayıtlı Trendyol oturumu). ASLA sipariş verilmez, Sepeti Onayla'ya basılmaz.
const path = require('path');
const L = require('./lib');
const { CFG, DATA, log, numTR, ymd, sleep } = L;
const PROFILE = path.join(DATA, 'trendyol_profil'), CACHE = path.join(DATA, 'sepet_onbellek.json'), UAF = path.join(DATA, 'ua.txt');
const fs = require('fs');
// Güvenlik: bu metinleri içeren hiçbir şeye tıklanmaz (sipariş/ödeme/Şimdi Al/Sepeti Onayla)
const YASAK = /onayla|ödeme|öde\b|satın al|şimdi al|hemen al|siparişi|tamamla|alışverişi/i;
const OVERLAY = '[data-testid="overlay"], .onboarding-tour__overlay, [class*="onboarding-tour"], #onetrust-consent-sdk';
const T = 45000;
async function ctx(headless) {
  const { chromium } = require('playwright');
  const opt = { headless, locale: 'tr-TR', viewport: { width: 1366, height: 900 }, args: ['--disable-blink-features=AutomationControlled'] };
  // Cloudflare "HeadlessChrome" kullanıcı ajanını engelliyor (403): normal Chrome ajanı kullan
  let ua = fs.existsSync(UAF) ? fs.readFileSync(UAF, 'utf8').trim() : '';
  if (!ua && headless) {
    const c0 = await chromium.launch({ headless: true }); const p0 = await c0.newPage();
    ua = (await p0.evaluate(() => navigator.userAgent)).replace('HeadlessChrome', 'Chrome'); await c0.close(); fs.writeFileSync(UAF, ua);
  }
  if (ua) opt.userAgent = ua;
  return chromium.launchPersistentContext(PROFILE, opt);
}
async function diag(page, tag) {
  try {
    const b = path.join(L.LOGS, `sepet_${tag}_${L.stamp().replace(/[-: ]/g, '')}`);
    await page.screenshot({ path: b + '.png', fullPage: true }); fs.writeFileSync(b + '.html', await page.content()); log('Teşhis kaydedildi:', b + '.png/.html');
  } catch {}
}
async function unblock(page) { await page.evaluate(s => document.querySelectorAll(s).forEach(e => e.remove()), OVERLAY).catch(() => {}); }
async function safeClick(loc) {
  const t = `${await loc.innerText({ timeout: 3000 }).catch(() => '')} ${(await loc.getAttribute('aria-label', { timeout: 3000 }).catch(() => '')) || ''}`;
  if (YASAK.test(t)) throw new Error('GÜVENLİK: yasak düğme engellendi: ' + t.trim());
  try { await loc.click({ timeout: 6000 }); }
  catch { await unblock(loc.page()); try { await loc.click({ timeout: 4000 }); } catch { await loc.evaluate(el => el.click()); } }
}
async function go(page, url, waitSel) {
  const r = await page.goto(url, { waitUntil: 'commit', timeout: T });
  if (r && r.status() === 403) throw new Error('ENGEL_403 (Cloudflare) ' + url);
  if (waitSel) await page.locator(waitSel).first().waitFor({ timeout: T }).catch(() => {});
  else await page.waitForLoadState('domcontentloaded', { timeout: T }).catch(() => {});
  await page.waitForTimeout(2500); await unblock(page);
}
const ITEM = '.merchant-item', EMPTY = /Sepetinde ürün bulunmamaktadır|sepetin(iz)? boş/i;
async function goSepet(page) {
  await go(page, 'https://www.trendyol.com/sepet', `${ITEM}, text=/Sepetinde ürün bulunmamaktadır/`);
  if (/giris|login/i.test(page.url())) throw new Error('TRENDYOL_GIRIS_YOK: kurulum.ps1 -SadeceGiris ile tekrar giriş yapın');
  await page.waitForTimeout(1500);
  return { n: await page.locator(ITEM).count(), body: await page.innerText('body') };
}
async function clearCart(page) {
  for (let i = 0; i < 40; i++) {
    const s = await goSepet(page);
    if (s.n === 0) { if (EMPTY.test(s.body) || !/Ara Toplam/i.test(s.body)) return; throw new Error('SEPET_DURUMU_BELIRSIZ'); }
    const del = page.locator(`${ITEM} .remove-item-container`).first();
    if (!await del.count()) { await diag(page, 'silyok'); throw new Error('SEPET_SIL_DUGMESI_BULUNAMADI'); }
    await safeClick(del); await page.waitForTimeout(2000);
    const ok = page.getByRole('button', { name: /^(Sil|Evet|Sepetten Çıkar|Kaldır|Ürünü Sil)$/i }).first();
    if (await ok.count()) await safeClick(ok).catch(() => {});
    await page.waitForTimeout(2000);
  }
  throw new Error('SEPET_BOSALTILAMADI');
}
function midFrom(s) {
  const m = /[?&](?:mid|merchantId)=(\d+)/.exec(s) || /-m-(\d+)(?:[/?#"]|$)/.exec(s) || /"merchantId"\s*:\s*(\d+)/.exec(s);
  return m ? m[1] : null;
}
async function qtyValue(page) { return parseInt(await page.locator(`${ITEM} [data-testid="quantity-selector"]`).first().inputValue().catch(() => '0'), 10) || 0; }
async function one(page, link) {
  await page.goto(link, { waitUntil: 'commit', timeout: T }); await page.waitForURL(/trendyol\.com\//, { timeout: T }).catch(() => {});
  if (/not-found|\/404/.test(page.url())) throw new Error('MAGAZA_BULUNAMADI (link artık geçersiz)');
  const mid = midFrom(page.url()) || midFrom(await page.content().catch(() => '')); if (!mid) { await diag(page, 'mid'); throw new Error('MID_BULUNAMADI ' + page.url()); }
  await go(page, `https://www.trendyol.com/sr?mid=${mid}&os=1&sst=PRICE_BY_ASC`, 'a[href*="-p-"]');
  const hrefs = await page.$$eval('a[href*="-p-"]', as => as.map(a => a.getAttribute('href')));
  const h = hrefs.find(x => x.includes(`merchantId=${mid}`)) || hrefs[0];
  if (!h) { await diag(page, 'urunyok'); throw new Error('URUN_YOK mid=' + mid); }
  await go(page, new URL(h, 'https://www.trendyol.com').href, '[data-testid="add-to-cart-button"]');
  const add = page.locator('[data-testid="add-to-cart-button"]:visible').first();
  if (!await add.count()) { await diag(page, 'ekleyok'); throw new Error('SEPETE_EKLE_YOK'); }
  const resp = page.waitForResponse(r => /basket|cart/i.test(r.url()) && r.request().method() !== 'GET', { timeout: 15000 }).catch(() => null);
  await safeClick(add);
  const rr = await resp; await page.waitForTimeout(2500);
  const eklendi = rr || (await goSepet(page)).n > 0;
  if (!eklendi) { if (/beden|seçiniz/i.test(await page.innerText('body'))) throw new Error('VARYANT_SECIMI_GEREKLI'); await diag(page, 'eklenmedi'); throw new Error('URUN_SEPETE_EKLENMEDI'); }
  await page.waitForTimeout(1500);
  let s = await goSepet(page);
  for (let k = 0; k < 2 && !s.n; k++) { await page.waitForTimeout(4000); s = await goSepet(page); }
  if (!s.n) { await diag(page, 'sepetbos'); throw new Error('URUN_SEPETTE_YOK'); }
  if (s.n > 1) throw new Error('SEPETTE_BASKA_URUN_VAR');
  const adet = CFG.trendyol.sepetAdet || 3;
  const btns = page.locator(`${ITEM} .quantity-select-with-buttons button`);
  // Adet: her tıktan sonra sepet güncellenene kadar bekle; fazla çıkarsa eksiye bas
  for (let i = 0; i < adet + 6; i++) {
    const before = await qtyValue(page); if (before === adet) break;
    const btn = before < adet ? btns.last() : btns.first();
    const w = page.waitForResponse(r => /basket|cart/i.test(r.url()) && r.request().method() !== 'GET', { timeout: 10000 }).catch(() => null);
    await safeClick(btn); await w;
    for (let k = 0; k < 8 && await qtyValue(page) === before; k++) await page.waitForTimeout(1000);
    await page.waitForTimeout(1500);
  }
  const q = await qtyValue(page); if (q !== adet) { await diag(page, 'adet'); throw new Error(`ADET_AYARLANAMADI (${q})`); }
  await page.waitForTimeout(2000); const b = (await page.innerText('body')).replace(/\s+/g, ' ');
  const ara = numTR((/Ara Toplam\s*:?\s*([\d.,]+)\s*TL/i.exec(b) || /Ürünlerin? Toplamı\s*:?\s*([\d.,]+)\s*TL/i.exec(b) || [])[1]);
  const kaz = numTR((/Toplam Kazanc[ıi]n\s*:?\s*[-−]?\s*([\d.,]+)\s*TL/i.exec(b) || [])[1]) || 0;
  if (ara === null) { await diag(page, 'aratoplam'); throw new Error('ARA_TOPLAM_OKUNAMADI'); }
  log(`Özet: ${(b.match(/(Sipariş Özeti|Ara Toplam).{0,250}/i) || [''])[0]}`);
  await clearCart(page);
  return { mid, tutar: Math.round((ara - kaz) * 100) / 100, ara, kaz };
}
async function computeMany(list) {
  const today = ymd(), cache = L.readJson(CACHE, { mids: {}, links: {} }), res = {};
  const need = [];
  for (const t of list) { const m = cache.links[t.link], c = m && cache.mids[m];
    if (c && c.tarih === today) { res[t.link] = { tutar: c.tutar, mid: m }; log(`Sepet ${t.brand}: bugün hesaplanmış mid ${m} -> ${c.tutar}`); } else need.push(t); }
  if (!need.length) return res;
  const c = await ctx(CFG.trendyol.sepetHeadless !== false); const page = c.pages()[0] || await c.newPage();
  try {
    await clearCart(page); // yabancı ürünleri önce temizle
    let bad = 0;
    for (const t of need) {
      try {
        const r = await one(page, t.link); res[t.link] = r; bad = 0;
        cache.links[t.link] = r.mid; cache.mids[r.mid] = { tutar: r.tutar, tarih: today }; L.writeJson(CACHE, cache);
        log(`Sepet ${t.brand}: mid ${r.mid} ara ${r.ara} - kazanç ${r.kaz} = ${r.tutar}`);
        const again = need.filter(x => x !== t && !res[x.link]);
        for (const x of again) if (cache.links[x.link] === r.mid) res[x.link] = { tutar: r.tutar, mid: r.mid };
      } catch (e) {
        res[t.link] = { hata: e.message.slice(0, 160) }; log(`Sepet ${t.brand} HATA: ${e.message}`);
        if (/GIRIS_YOK|GÜVENLİK/.test(e.message)) { res.__fatal = e.message; break; }
        try { await clearCart(page); } catch {}
        if (!/MAGAZA_BULUNAMADI|URUN_YOK|VARYANT/.test(e.message) && ++bad >= 3) { res.__fatal = 'Sepet: art arda 3 hata, durduruldu (site değişmiş olabilir)'; break; }
      }
    }
  } catch (e) { res.__fatal = 'Sepet: ' + e.message; }
  finally { try { await clearCart(page); } catch {} await c.close(); }
  return res;
}
async function giris() {
  const c = await ctx(false); const page = c.pages()[0] || await c.newPage();
  await page.goto('https://www.trendyol.com/giris');
  console.log('Açılan pencerede Trendyol hesabınıza giriş yapın, sonra pencereyi kapatın.');
  await new Promise(r => c.on('close', r));
  console.log('Oturum kaydedildi.');
}
async function test(link) { const r = await computeMany([{ link, brand: 'TEST', row: 0 }]); console.log(r); }
module.exports = { computeMany, giris, test };
