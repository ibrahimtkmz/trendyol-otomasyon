// Ortak yardımcılar: ayarlar, log, tarih, ADB, PowerShell, kilit, bildirim
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8').replace(/^\uFEFF/, ''));
const DATA = path.join(ROOT, 'data'), LOGS = path.join(ROOT, 'logs');
for (const d of [DATA, LOGS, path.join(DATA, 'arsiv')]) fs.mkdirSync(d, { recursive: true });
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const pad = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const stamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let LOGNAME = 'genel';
const setLog = n => { LOGNAME = n; };
function log(...a) {
  const l = `[${stamp()}] ${a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')}`;
  console.log(l);
  fs.appendFileSync(path.join(LOGS, `${LOGNAME}_${ymd()}.log`), l + '\r\n', 'utf8');
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function parseTrDay(s) {
  const m = /^\s*(\d{1,2})\s+(\S+)/.exec(String(s || '')); if (!m) return null;
  const mi = AYLAR.findIndex(a => a.toLocaleLowerCase('tr') === m[2].toLocaleLowerCase('tr'));
  return mi < 0 ? null : { d: +m[1], m: mi };
}
const sameDay = (s, d) => { const p = parseTrDay(s); return !!p && p.d === d.getDate() && p.m === d.getMonth(); };
const FM = { 'İ':'I','ı':'i','Ş':'S','ş':'s','Ğ':'G','ğ':'g','Ü':'U','ü':'u','Ö':'O','ö':'o','Ç':'C','ç':'c','Â':'A','â':'a' };
const fold = s => String(s || '').replace(/[İıŞşĞğÜüÖöÇçÂâ]/g, c => FM[c]);
const norm = s => fold(s).toLowerCase().replace(/[^a-z0-9]/g, '');
// "1.077" -> 1077, "₺1.592" -> 1592, "298,41" -> 298.41, "1,2K" -> 1200
function numTR(s) {
  if (s === null || s === undefined || s === '') return null;
  if (typeof s === 'number') return s;
  let t = String(s).replace(/TL|[₺?\s\u00a0]/gi, ''); let mul = 1;
  if (/[KB]$/i.test(t)) { mul = 1000; t = t.slice(0, -1); }
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const v = parseFloat(t); return isNaN(v) ? null : Math.round(v * mul * 100) / 100;
}
const readJson = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')); } catch { return def; } };
const writeJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1), 'utf8');
function adb(serial, args, timeout = 60000) {
  return cp.execFileSync(CFG.adb, ['-s', serial, ...args], { windowsHide: true, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
}
function adbConnect(serial) {
  if (!serial.includes(':')) return;
  try { cp.execFileSync(CFG.adb, ['connect', serial], { windowsHide: true, encoding: 'utf8', timeout: 20000 }); } catch {}
}
function adbOk(serial) { try { return adb(serial, ['get-state'], 15000).trim() === 'device'; } catch { return false; } }
// PowerShell betiğini gizli çalıştır; zaman aşımında süreç ağacını öldür
function runPs(file, args = [], { timeoutMin = 30, env = {} } = {}) {
  return new Promise(res => {
    const p = cp.spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file, ...args],
      { windowsHide: true, env: { ...process.env, ...env } });
    let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
    const t = setTimeout(() => { out += '\nZAMAN_ASIMI'; try { cp.execSync(`taskkill /T /F /PID ${p.pid}`, { windowsHide: true }); } catch {} }, timeoutMin * 60000);
    p.on('close', code => { clearTimeout(t); res({ code, out }); });
  });
}
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
// BlueStacks 4 (5585) için kilit: aynı anda tek iş
async function withLock(name, maxWaitMin, fn) {
  const f = path.join(DATA, name + '.lock'), t0 = Date.now();
  for (;;) {
    try { fs.writeFileSync(f, `${process.pid} ${stamp()}`, { flag: 'wx' }); break; }
    catch {
      const pid = parseInt((fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '0'), 10);
      const st = fs.existsSync(f) ? fs.statSync(f) : null;
      if (!st || !pidAlive(pid) || Date.now() - st.mtimeMs > 4 * 3600e3) { try { fs.unlinkSync(f); } catch {} continue; }
      if (Date.now() - t0 > maxWaitMin * 60000) throw new Error(`KILIT_BEKLEME_ASIMI (${name}, başka iş BlueStacks 4'ü kullanıyor)`);
      if (Date.now() - t0 < 1000) log(`Kilit dolu (${name}), bekleniyor...`);
      await sleep(30000);
    }
  }
  try { return await fn(); } finally { try { fs.unlinkSync(f); } catch {} }
}
function notify(title, msg) {
  fs.appendFileSync(path.join(LOGS, 'bildirimler.txt'), `\r\n[${stamp()}] ${title}\r\n${msg}\r\n`, 'utf8');
  log('BILDIRIM', title, '|', msg.replace(/\n/g, ' / '));
  if (!CFG.bildirimToast) return;
  try {
    const tf = path.join(os.tmpdir(), `oto_bildirim_${Date.now()}.txt`);
    fs.writeFileSync(tf, '\uFEFF' + msg, 'utf8');
    cp.spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'bildirim.ps1'), '-t', title, '-f', tf],
      { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
  } catch {}
}
module.exports = { ROOT, CFG, DATA, LOGS, AYLAR, pad, ymd, stamp, sleep, setLog, log, addDays, parseTrDay, sameDay, fold, norm, numTR,
  readJson, writeJson, adb, adbConnect, adbOk, runPs, withLock, notify };
