// DocSmartly online exam API. Runs on a Cloudflare Worker with a D1 database bound as DB.
// No accounts: a teacher gets an exam link and a secret teacher key when creating an exam.

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, x-teacher-key',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } });

const sha256 = async text => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
};

// Short ids and keys without confusing characters.
const randomId = (len, alphabet = 'abcdefghijkmnpqrstuvwxyz23456789') => {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
};

const ID_PATTERN = /^[a-z0-9]{8}$/;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      const parts = new URL(request.url).pathname.split('/').filter(Boolean);
      if (parts[0] !== 'api' || parts[1] !== 'exams') return json({ error: 'Not found.' }, 404);

      if (parts.length === 2 && request.method === 'POST') return await createExam(request, env);

      const id = parts[2];
      if (!ID_PATTERN.test(id || '')) return json({ error: 'Exam not found.' }, 404);

      if (parts.length === 3 && request.method === 'GET') return await getExam(id, env);
      if (parts[3] === 'submit' && request.method === 'POST') return await submit(id, request, env);
      if (parts[3] === 'results' && request.method === 'GET') return await results(id, request, env);
      return json({ error: 'Not found.' }, 404);
    } catch (err) {
      return json({ error: 'The exam server had a problem. Please try again.' }, 500);
    }
  },
};

async function createExam(request, env) {
  const body = await request.json().catch(() => null);
  const title = String(body?.title || '').trim().slice(0, 120);
  const input = Array.isArray(body?.questions) ? body.questions : [];
  if (!title || input.length < 1 || input.length > 200) {
    return json({ error: 'Add a title and between 1 and 200 questions.' }, 400);
  }
  const questions = input.map(q => ({
    q: String(q?.q || '').trim().slice(0, 500),
    options: (Array.isArray(q?.options) ? q.options : []).map(o => String(o).trim().slice(0, 200)).slice(0, 5),
    answer: Number(q?.answer),
  }));
  for (const q of questions) {
    if (!q.q || q.options.length < 2 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
      return json({ error: 'Each question needs text, 2 to 5 options and a correct answer.' }, 400);
    }
  }
  const id = randomId(8), teacherKey = randomId(16);
  await env.DB.prepare(
    'INSERT INTO exams (id, title, questions, key_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, title, JSON.stringify(questions), await sha256(teacherKey), Date.now()).run();
  return json({ id, teacherKey }, 201);
}

async function getExam(id, env) {
  const row = await env.DB.prepare('SELECT title, questions FROM exams WHERE id = ?').bind(id).first();
  if (!row) return json({ error: 'Exam not found.' }, 404);
  // Correct answers are never sent to students.
  const questions = JSON.parse(row.questions).map(({ q, options }) => ({ q, options }));
  return json({ id, title: row.title, questions });
}

async function submit(id, request, env) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim().slice(0, 80);
  if (!name) return json({ error: 'Enter your name.' }, 400);
  const row = await env.DB.prepare('SELECT questions FROM exams WHERE id = ?').bind(id).first();
  if (!row) return json({ error: 'Exam not found.' }, 404);

  const questions = JSON.parse(row.questions);
  const given = Array.isArray(body?.answers) ? body.answers : [];
  const stored = questions.map((_, i) => (Number.isInteger(Number(given[i])) ? Number(given[i]) : -1));
  const score = questions.reduce((s, q, i) => s + (stored[i] === q.answer ? 1 : 0), 0);

  await env.DB.prepare(
    'INSERT INTO submissions (exam_id, name, answers, score, total, submitted_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, name, JSON.stringify(stored), score, questions.length, Date.now()).run();
  return json({ score, total: questions.length });
}

async function results(id, request, env) {
  const key = request.headers.get('x-teacher-key') || '';
  const exam = await env.DB.prepare('SELECT title, key_hash FROM exams WHERE id = ?').bind(id).first();
  if (!exam) return json({ error: 'Exam not found.' }, 404);
  if (!key || (await sha256(key)) !== exam.key_hash) return json({ error: 'The teacher key is wrong.' }, 403);

  const { results: rows } = await env.DB.prepare(
    'SELECT name, score, total, submitted_at FROM submissions WHERE exam_id = ? ORDER BY submitted_at'
  ).bind(id).all();
  return json({ title: exam.title, results: rows });
}
