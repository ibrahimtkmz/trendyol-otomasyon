// Giriş noktası: node src/main.js aff [main|retry] | trendyol [sadece-sepet] | giris | test | sepet-test <ty.gl>
const L = require('./lib');
const [cmd, arg] = process.argv.slice(2);
(async () => {
  L.setLog(cmd === 'aff' ? 'aff' : cmd === 'trendyol' ? 'trendyol' : 'genel');
  try {
    if (cmd === 'aff') await require('./aff').run(arg || 'main');
    else if (cmd === 'trendyol') await require('./trendyol').run(arg || '');
    else if (cmd === 'giris') await require('./sepet').giris();
    else if (cmd === 'sepet-test') await require('./sepet').test(arg);
    else if (cmd === 'test') {
      const S = require('./sheets');
      for (const id of [L.CFG.aff.sheetId, L.CFG.trendyol.sheetId]) { const m = await S.meta(id); console.log('OK', m.properties.title, '-', m.sheets.length, 'sekme'); }
    } else console.log('Kullanım: node src/main.js aff [main|retry] | trendyol [sadece-sepet] | giris | test | sepet-test <link>');
  } catch (e) {
    L.log('HATA', e.stack || String(e));
    if (cmd === 'aff' || cmd === 'trendyol') L.notify(`Otomasyon hata (${cmd})`, e.message);
    else console.error('HATA:', e.message);
    process.exitCode = 1;
  }
})();
