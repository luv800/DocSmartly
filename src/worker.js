const STATUS = ['pending', 'processing', 'success', 'failed'];
const RESET_CODE_DEFAULT = '123456';

const PRICES = {
 "RC Services|RC PDF INSTANT": 40,
 "DL Services|DL PDF INSTANT": 50,
 "Voter Services|Voter Mobile Link": 40,
 "Farmer Services|KISAN CARD": 25,
 "PAN Services|Aadhaar to PAN": 250,
 "Udyam Services|New UDYAM CERTIFICATE": 200,
 "Aadhaar Update & Ration Service|AADHAAR Update": 150,
 "Mobile Services|Mobile Details Find": 30,
 "Mobile Services|Other Mobile Issue": 50,
 "GST Services|New GST Certificate": 1200,
 "GST Services|GST Download": 200,
 "Chassis & Engine To RC|Chassis to RC": 70,
 "Challan Check|Challan Details": 10,
 "Bank Seeding|DBT Seeding Status": 20,
 "Lost Document Service|Voter ID": 50,
 "Lost Document Service|Aadhaar Card": 50,
 "Lost Document Service|PAN Card": 50,
 "Lost Document Service|Driving License": 50,
 "PAN Card Service|New PAN apply": 600,
 "PAN Card Service|PAN update / correction": 600,
 "PVC Tools|Voter ID": 10,
 "PVC Tools|Aadhaar Card": 10,
 "PVC Tools|PAN Card": 10,
 "PVC Tools|Driving License": 10,
 "PVC Tools|Vehicle RC": 10,
 "PVC Tools|Any Other Document": 10,
 "Govt Department & Civil Contractor Services|New Digital Signature (DSC)": 2500,
 "Govt Department & Civil Contractor Services|E-procurement registration": 500,
 "Govt Department & Civil Contractor Services|Tender upload (for contractor)": 300,
 "Govt Department & Civil Contractor Services|Tender upload (for department)": 700,
 "Govt Department & Civil Contractor Services|Building estimate creator": 200,
 "Govt Department & Civil Contractor Services|BOQ creator": 200,
 "Govt Department & Civil Contractor Services|Govt civil & electric bill maker (Excel)": 1000,
 "Govt Department & Civil Contractor Services|Bill form": 400,
 "Govt Department & Civil Contractor Services|Extra item sheet": 200,
 "Govt Department & Civil Contractor Services|Excess item sheet": 200,
 "Govt Department & Civil Contractor Services|QC register creator": 500,
 "Govt Department & Civil Contractor Services|Work escalation statement": 700
};

const allowedOrigins = env => (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const cors = (req, env) => {
  const list = allowedOrigins(env), o = req.headers.get('origin');
  return {
    'access-control-allow-origin': list.includes(o) ? o : (list[0] || 'null'),
    'access-control-allow-headers': 'content-type,x-user-token,x-admin-passcode,x-file-name',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'vary': 'origin',
  };
};
const reply = (req, env, data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors(req, env), 'content-type': 'application/json' } });
const strip = ({ hash, salt, token, ...rest }) => rest;

const normId = v => {
  const s = String(v || '').trim();
  if (s.includes('@')) return { col: 'mail', val: s.toLowerCase() };
  let d = s.replace(/\D/g, '');
  if (d.length == 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length == 11 && d[0] == '0') d = d.slice(1);
  return { col: 'mob', val: d };
};

const one = async (env, sql, ...args) => {
  const r = await env.DB.prepare(sql).bind(...args).first();
  return r ? JSON.parse(r.data) : null;
};
const findById = (env, id) => one(env, 'SELECT data FROM users WHERE id=?', id);
const findByToken = (env, t) => (t ? one(env, 'SELECT data FROM users WHERE token=?', t) : null);
const findByLogin = (env, id) => {
  const { col, val } = normId(id);
  return val ? one(env, `SELECT data FROM users WHERE ${col}=?`, val) : null;
};
const allUsers = async env =>
  (await env.DB.prepare('SELECT data FROM users').all()).results.map(r => JSON.parse(r.data));
const saveRow = (env, u) =>
  env.DB.prepare(`INSERT INTO users (id,mob,mail,token,data) VALUES (?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET mob=excluded.mob, mail=excluded.mail, token=excluded.token, data=excluded.data`)
    .bind(u.id, u.mob, u.mail, u.token ?? null, JSON.stringify(u)).run();

const newCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of crypto.getRandomValues(new Uint8Array(6))) s += chars[b % chars.length];
  return s;
};
const cleanData = d => {
  const out = {};
  if (d && typeof d === 'object')
    for (const [k, v] of Object.entries(d).slice(0, 50)) out[String(k).slice(0, 100)] = String(v ?? '').slice(0, 1000);
  return out;
};

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req, env) });

    const p = new URL(req.url).pathname, M = req.method;
    let m;
    const bad = (s = 400, e = 'bad_request') => reply(req, env, { error: e }, s);
    const unauth = () => bad(401, 'session');
    const readJson = async () => { try { return await req.json(); } catch { return {}; } };
    const authed = () => findByToken(env, req.headers.get('x-user-token'));
    const adminOK = () => !!env.ADMIN_PASSCODE && req.headers.get('x-admin-passcode') === env.ADMIN_PASSCODE;

    try {
      if (M === 'GET' && (m = p.match(/^\/api\/salt\/(.+)$/))) {
        const u = await findByLogin(env, decodeURIComponent(m[1]));
        return u ? reply(req, env, { salt: u.salt }) : bad(404, 'not_found');
      }

      if (M === 'GET' && (m = p.match(/^\/api\/lookup\/(.+)$/))) {
        const u = await findByLogin(env, decodeURIComponent(m[1]));
        return reply(req, env, { exists: !!u });
      }

      if (M === 'POST' && p === '/api/login') {
        const { id, hash } = await readJson();
        const u = await findByLogin(env, id);
        if (!u || u.hash !== hash) return bad(401, 'bad_credentials');
        u.token = crypto.randomUUID();
        await saveRow(env, u);
        return reply(req, env, { user: strip(u), token: u.token });
      }

      if (M === 'POST' && p === '/api/register') {
        const { user: inc = {}, ref = '' } = await readJson();
        const mob = normId(inc.mob).val;
        const mail = String(inc.mail || '').trim().toLowerCase();
        const name = String(inc.name || '').trim().slice(0, 100);
        if (!/^\d{10}$/.test(mob) || !/^\S+@\S+\.\S+$/.test(mail) || !name || !inc.salt || !inc.hash) return bad();
        if ((await findByLogin(env, mob)) || (await findByLogin(env, mail))) return bad(409, 'exists');

        const all = await allUsers(env);
        const referrer = ref
          ? all.find(x => String(x.code || '').toUpperCase() === String(ref).trim().toUpperCase())
          : null;
        const used = new Set(all.map(x => x.code));
        let code;
        do code = newCode(); while (used.has(code));

        const u = {
          id: crypto.randomUUID(), name, mob, mail, salt: inc.salt, hash: inc.hash, code,
          bal: 0, tx: [], orders: [], fav: [], refs: [], first: false, token: crypto.randomUUID(),
        };
        if (referrer) {
          u.refBy = referrer.id;
          (referrer.refs ||= []).push({ id: u.id, name, t: Date.now(), st: 'Pending', bonus: 0 });
          await saveRow(env, referrer);
        }
        await saveRow(env, u);
        return reply(req, env, { user: strip(u), token: u.token }, 201);
      }

      if (M === 'POST' && p === '/api/reset') {
        const { id, code, salt, hash } = await readJson();
        if (String(code) !== (env.RESET_CODE || RESET_CODE_DEFAULT)) return bad(400, 'bad_code');
        const u = await findByLogin(env, id);
        if (!u || !salt || !hash) return bad(404, 'not_found');
        u.salt = salt;
        u.hash = hash;
        u.token = null;
        await saveRow(env, u);
        return reply(req, env, { ok: true });
      }

      if (p === '/api/me' && M === 'GET') {
        const u = await authed();
        return u ? reply(req, env, { user: strip(u) }) : unauth();
      }

      if (p === '/api/me' && M === 'PUT') {
        const u = await authed();
        if (!u) return unauth();
        const inc = await readJson();
        if (Array.isArray(inc.fav) && JSON.stringify(inc.fav).length < 20000) u.fav = inc.fav;
        await saveRow(env, u);
        return reply(req, env, { user: strip(u) });
      }

      if (M === 'POST' && p === '/api/topup') {
        const u = await authed();
        if (!u) return unauth();
        const { amt } = await readJson();
        const v = Math.floor(Number(amt));
        if (!(v >= 200)) return bad(400, 'min_amount');

        u.bal = (u.bal || 0) + v;
        (u.tx ||= []).push({ t: Date.now(), type: 'credit', amt: v, note: 'Added via UPI' });

        if (u.refBy && !u.first) {
          const r = await findById(env, u.refBy);
          if (r) {
            r.bal = (r.bal || 0) + 10;
            (r.tx ||= []).push({ t: Date.now(), type: 'credit', amt: 10, note: 'Referral bonus: ' + u.name });
            const f = (r.refs || []).find(x => x.id == u.id);
            if (f) { f.st = 'Credited'; f.bonus = 10; }
            await saveRow(env, r);
          }
        }
        u.first = true;
        await saveRow(env, u);
        return reply(req, env, { user: strip(u) });
      }

      if (M === 'POST' && p === '/api/requests') {
        const u = await authed();
        if (!u) return unauth();
        const { k, sec, data } = await readJson();
        const price = PRICES[k];
        if (!price) return bad(400, 'unknown_service');
        const n = String(k).split('|')[1];
        if ((u.bal || 0) < price) return bad(402, 'insufficient_balance');

        const t = Date.now();
        u.bal -= price;
        (u.tx ||= []).push({ t, type: 'debit', amt: price, note: String(n).slice(0, 200) });
        (u.orders ||= []).push({
          id: 'REQ-' + t.toString(36).toUpperCase(), t,
          n: String(n).slice(0, 200), sec: String(sec || '').slice(0, 200),
          s: 'pending', amt: price, data: cleanData(data),
        });
        await saveRow(env, u);
        return reply(req, env, { user: strip(u) }, 201);
      }

      if (M === 'GET' && (m = p.match(/^\/api\/requests\/([^/]+)$/))) {
        const rid = decodeURIComponent(m[1]);
        const u = await authed();
        if (!u) return unauth();
        const o = (u.orders || []).find(x => x.id === rid);
        if (!o) return bad(404, 'not_found');
        return reply(req, env, { request: o });
      }

      if (M === 'PATCH' && (m = p.match(/^\/api\/requests\/([^/]+)$/))) {
        const rid = decodeURIComponent(m[1]);
        const u = await authed();
        if (!u) return unauth();
        const o = (u.orders || []).find(x => x.id === rid);
        if (!o) return bad(404, 'not_found');
        const { s, data } = await readJson();
        if (s && STATUS.includes(s)) o.s = s;
        if (data && typeof data === 'object') {
          o.data = { ...(o.data || {}), ...cleanData(data) };
        }
        await saveRow(env, u);
        return reply(req, env, { ok: true, request: o });
      }

      if (M === 'GET' && (m = p.match(/^\/api\/requests\/([^/]+)\/file$/))) {
        const rid = decodeURIComponent(m[1]);
        const u = await authed();
        if (!u) return unauth();
        const o = (u.orders || []).find(x => x.id === rid);
        if (!o?.file) return bad(404, 'not_found');
        const obj = await env.FILES.get(rid);
        if (!obj) return bad(404, 'not_found');
        return new Response(obj.body, {
          headers: {
            ...cors(req, env),
            'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
            'content-disposition': `attachment; filename="${o.file.name.replace(/"/g, '')}"`,
          },
        });
      }

      if (p.startsWith('/api/admin/')) {
        if (!adminOK()) return bad(401, 'unauthorized');

        if (M === 'GET' && p === '/api/admin/users') {
          return reply(req, env, { users: (await allUsers(env)).map(strip) });
        }

        const owner = async rid =>
          (await allUsers(env)).find(x => (x.orders || []).some(o => o.id === rid));

        if (M === 'PUT' && (m = p.match(/^\/api\/admin\/requests\/([^/]+)\/status$/))) {
          const rid = decodeURIComponent(m[1]);
          const { s } = await readJson();
          if (!STATUS.includes(s)) return bad(400, 'bad_status');
          const u = await owner(rid);
          if (!u) return bad(404, 'not_found');
          u.orders.find(o => o.id === rid).s = s;
          await saveRow(env, u);
          return reply(req, env, { ok: true });
        }

        if (M === 'PUT' && (m = p.match(/^\/api\/admin\/requests\/([^/]+)\/file$/))) {
          const rid = decodeURIComponent(m[1]);
          const buf = await req.arrayBuffer();
          if (buf.byteLength > 1.5 * 1024 * 1024) return bad(413, 'too_large');
          const u = await owner(rid);
          if (!u) return bad(404, 'not_found');
          await env.FILES.put(rid, buf, {
            httpMetadata: { contentType: req.headers.get('content-type') || 'application/octet-stream' },
          });
          u.orders.find(o => o.id === rid).file = {
            name: decodeURIComponent(req.headers.get('x-file-name') || 'result'),
            size: buf.byteLength,
            t: Date.now(),
          };
          await saveRow(env, u);
          return reply(req, env, { ok: true });
        }

        if (M === 'PUT' && (m = p.match(/^\/api\/admin\/requests\/([^/]+)\/remark$/))) {
          const rid = decodeURIComponent(m[1]);
          const { remark, data } = await readJson();
          const u = await owner(rid);
          if (!u) return bad(404, 'not_found');
          const order = u.orders.find(o => o.id === rid);
          if (remark !== undefined) order.remark = String(remark ?? '').trim().slice(0, 500);
          if (data && typeof data === 'object') {
            order.data = { ...(order.data || {}), ...cleanData(data) };
          }
          await saveRow(env, u);
          return reply(req, env, { ok: true });
        }

        if (M === 'DELETE' && (m = p.match(/^\/api\/admin\/requests\/([^/]+)\/file$/))) {
          const rid = decodeURIComponent(m[1]);
          const u = await owner(rid);
          if (!u) return bad(404, 'not_found');
          await env.FILES.delete(rid);
          delete u.orders.find(o => o.id === rid).file;
          await saveRow(env, u);
          return reply(req, env, { ok: true });
        }

        return bad(404, 'not_found');
      }

      return bad(404, 'not_found');
    } catch (err) {
      return reply(req, env, { error: 'server', detail: String(err) }, 500);
    }
  },
};