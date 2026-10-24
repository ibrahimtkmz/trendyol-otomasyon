// Google Sheets REST istemcisi (servis hesabı JWT, ek paket gerekmez)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { ROOT, sleep } = require('./lib');
const SA = path.join(ROOT, 'service_account.json');
let tok = null;
const b64u = s => Buffer.from(s).toString('base64url');
async function token() {
  if (tok && tok.exp > Date.now() + 60000) return tok.t;
  if (!fs.existsSync(SA)) throw new Error('service_account.json bulunamadı (README_TR.txt adım 1)');
  const sa = JSON.parse(fs.readFileSync(SA, 'utf8').replace(/^\uFEFF/, ''));
  const aud = sa.token_uri || 'https://oauth2.googleapis.com/token', now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const c = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud, iat: now, exp: now + 3600 }));
  const sig = crypto.sign('RSA-SHA256', Buffer.from(h + '.' + c), sa.private_key).toString('base64url');
  const r = await fetch(aud, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${h}.${c}.${sig}` }) });
  const j = await r.json();
  if (!r.ok) throw new Error('Google giriş hatası: ' + JSON.stringify(j));
  tok = { t: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tok.t;
}
async function api(method, url, body) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + url, { method,
      headers: { authorization: 'Bearer ' + await token(), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 429 || r.status >= 500) { await sleep(5000 * (i + 1)); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = (j.error && j.error.message) || JSON.stringify(j);
      if (r.status === 403) throw new Error(`Tabloya erişim yok (servis hesabı e-postasıyla Düzenleyen olarak paylaşın): ${m}`);
      throw new Error(`SHEETS_${r.status}: ${m}`);
    }
    return j;
  }
  throw new Error('Google Sheets yanıt vermedi');
}
const q = t => `'${String(t).replace(/'/g, "''")}'`;
const get = async (id, range, render = 'FORMATTED_VALUE') =>
  (await api('GET', `${id}/values/${encodeURIComponent(range)}?valueRenderOption=${render}`)).values || [];
const update = async (id, data) => data.length ? api('POST', `${id}/values:batchUpdate`, { valueInputOption: 'USER_ENTERED', data }) : null;
const clear = (id, range) => api('POST', `${id}/values/${encodeURIComponent(range)}:clear`, {});
const meta = async id => (await api('GET', `${id}?fields=properties.title,sheets.properties`));
const batch = (id, requests) => api('POST', `${id}:batchUpdate`, { requests });
module.exports = { q, get, update, clear, meta, batch };
