import worker from './worker.js';
const rows = new Map(); // id -> row
const files = new Map();
const DB = {
  prepare(sql) {
    const s = sql.replace(/\s+/g, ' ').trim();
    return {
      _a: [],
      bind(...a) { this._a = a; return this; },
      async first() {
        const [v] = this._a;
        let m = s.match(/WHERE (id|token|mob|mail)=\?/);
        if (!m) throw new Error('unhandled first: ' + s);
        const hit = [...rows.values()].find(r => r[m[1]] === v);
        return hit ? { data: hit.data } : null;
      },
      async all() {
        if (s.startsWith('SELECT data FROM users')) return { results: [...rows.values()].map(r => ({ data: r.data })) };
        throw new Error('unhandled all: ' + s);
      },
      async run() {
        if (!s.startsWith('INSERT INTO users')) throw new Error('unhandled run: ' + s);
        const [id, mob, mail, token, data] = this._a;
        for (const r of rows.values()) if (r.id !== id && (r.mob === mob || r.mail === mail)) throw new Error('UNIQUE');
        rows.set(id, { id, mob, mail, token, data });
        return {};
      },
    };
  },
};
const FILES = {
  async put(k, b, o) { files.set(k, { b, o }); },
  async get(k) { const f = files.get(k); return f ? { body: f.b, httpMetadata: f.o.httpMetadata } : null; },
  async delete(k) { files.delete(k); },
};
const env = { DB, FILES, ALLOWED_ORIGINS: 'https://site.test', ADMIN_PASSCODE: 'secret-pass' };
const call = async (method, path, body, headers = {}) => {
  const req = new Request('https://api.test' + path, {
    method, headers: { origin: 'https://site.test', 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : (body instanceof Blob ? body : JSON.stringify(body)),
  });
  const r = await worker.fetch(req, env);
  return { status: r.status, json: r.status !== 204 && r.headers.get('content-type')?.includes('json') ? await r.json() : null, r };
};
const ok = (c, msg) => { if (!c) { console.error('FAIL:', msg); process.exitCode = 1; } else console.log('ok -', msg); };

// register
let r = await call('POST', '/api/register', { user: { name: 'Test User', mob: '9876543210', mail: 'T@x.in', salt: 'aa', hash: 'hh' } });
ok(r.status === 201 && r.json.token && r.json.user.code, 'register creates user with server code');
const tok = r.json.token;
r = await call('POST', '/api/register', { user: { name: 'Dup', mob: '9876543210', mail: 'd@x.in', salt: 'a', hash: 'b' } });
ok(r.status === 409, 'duplicate mobile rejected');
// lookup + salt + login
r = await call('GET', '/api/lookup/t@x.in');
ok(r.json.exists === true, 'lookup by email');
r = await call('GET', '/api/salt/+91 98765 43210');
ok(r.json.salt === 'aa', 'salt by mobile with +91 format');
r = await call('POST', '/api/login', { id: 't@x.in', hash: 'wrong' });
ok(r.status === 401, 'wrong hash rejected');
r = await call('POST', '/api/login', { id: '9876543210', hash: 'hh' });
ok(r.status === 200 && r.json.token, 'login with mobile');
const t2 = r.json.token;
// me
r = await call('GET', '/api/me', undefined, { 'x-user-token': t2 });
ok(r.status === 200 && r.json.user.salt === undefined && r.json.user.hash === undefined, 'me strips hash/salt');
// topup below minimum
r = await call('POST', '/api/topup', { amt: 100 }, { 'x-user-token': t2 });
ok(r.status === 400, 'topup under 200 rejected');
r = await call('POST', '/api/topup', { amt: 500 }, { 'x-user-token': t2 });
ok(r.json.user.bal === 500, 'topup credits balance');
// request with price from server
r = await call('POST', '/api/requests', { k: 'RC Services|RC PDF INSTANT', sec: 'RC Services', data: { 'Vehicle number': 'RJ14AB1234' }, amt: 1 }, { 'x-user-token': t2 });
ok(r.status === 201 && r.json.user.bal === 460, 'request charged server price 40 (client amt ignored)');
const rid = r.json.user.orders[0].id;
r = await call('POST', '/api/requests', { k: 'Fake|Thing' }, { 'x-user-token': t2 });
ok(r.status === 400, 'unknown service rejected');
r = await call('POST', '/api/requests', { k: 'PAN Services|Aadhaar to PAN' }, { 'x-user-token': t2 });
ok(r.status === 402, 'insufficient balance rejected (250 > 460? no, see next)');
// admin
r = await call('GET', '/api/admin/users', undefined, { 'x-admin-passcode': 'nope' });
ok(r.status === 401, 'admin wrong passcode rejected');
r = await call('GET', '/api/admin/users', undefined, { 'x-admin-passcode': 'secret-pass' });
ok(r.json.users.length === 1 && r.json.users[0].orders.length === 1, 'admin sees customer and request');
r = await call('PUT', `/api/admin/requests/${encodeURIComponent(rid)}/status`, { s: 'success' }, { 'x-admin-passcode': 'secret-pass' });
ok(r.status === 200, 'admin status update');
// file upload + customer download
const blob = new Blob(['PDF-DATA'], { type: 'application/pdf' });
r = await call('PUT', `/api/admin/requests/${encodeURIComponent(rid)}/file`, blob, { 'x-admin-passcode': 'secret-pass', 'content-type': 'application/pdf', 'x-file-name': 'result.pdf' });
ok(r.status === 200, 'admin file upload');
r = await call('GET', `/api/requests/${encodeURIComponent(rid)}/file`, undefined, { 'x-user-token': t2 });
ok(r.status === 200 && (await r.r.text()) === 'PDF-DATA', 'customer downloads own file');
// another user cannot download it
r = await call('POST', '/api/register', { user: { name: 'Other', mob: '9123456780', mail: 'o@x.in', salt: 'c', hash: 'd' }, ref: '' });
const other = r.json.token;
r = await call('GET', `/api/requests/${encodeURIComponent(rid)}/file`, undefined, { 'x-user-token': other });
ok(r.status === 404, 'other customer cannot download');
// referral: new user with code of first user, first topup credits referrer
const code = (await call('GET', '/api/me', undefined, { 'x-user-token': t2 })).json.user.code;
r = await call('POST', '/api/register', { user: { name: 'Friend', mob: '9000000001', mail: 'f@x.in', salt: 'e', hash: 'f' }, ref: code });
const friendTok = r.json.token;
await call('POST', '/api/topup', { amt: 300 }, { 'x-user-token': friendTok });
r = await call('GET', '/api/me', undefined, { 'x-user-token': t2 });
ok(r.json.user.bal === 470 && r.json.user.refs[0].st === 'Credited', 'referral bonus 10 credited on friend first topup');
// logout-ish: restored session with bad token
r = await call('GET', '/api/me', undefined, { 'x-user-token': 'bogus' });
ok(r.status === 401, 'bad token -> 401');
// reset flow
r = await call('POST', '/api/reset', { id: '9876543210', code: '000000', salt: 'z', hash: 'y' });
ok(r.status === 400, 'reset with wrong code rejected');
r = await call('POST', '/api/reset', { id: '9876543210', code: '123456', salt: 'z', hash: 'y' });
r = await call('POST', '/api/login', { id: '9876543210', hash: 'y' });
ok(r.status === 200, 'login works after reset');
// CORS preflight
const pre = await worker.fetch(new Request('https://api.test/api/me', { method: 'OPTIONS', headers: { origin: 'https://site.test' } }), env);
ok(pre.status === 204 && pre.headers.get('access-control-allow-origin') === 'https://site.test', 'CORS preflight allowed for site origin');
