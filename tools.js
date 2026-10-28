/* DocSmartly free tools (all batches in one file). Runs in the browser; nothing is uploaded,
   except the optional IP lookup in 'What Is My IP' and the exam server in 'Online Exam System'. */
/* DocSmartly free tools. Runs in the browser; nothing is uploaded. */
(function () {
  'use strict';

  const $ = (root, sel) => root.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const inr = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const libs = {};
  const load = (key, url) => libs[key] || (libs[key] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = res;
    s.onerror = () => { delete libs[key]; rej(new Error('load ' + key)); };
    document.head.appendChild(s);
  }));
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const QRLIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
  const saveBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const loadImg = f => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f);
  });
  const toBlob = (c, t, q) => new Promise(r => c.toBlob(r, t, q));
  const go = label => `<button type="button" class="btn" data-go style="margin-top:12px">${label}</button>`;
  const out = '<p class="sub" data-out style="margin-top:12px"></p>';
  const num = (id, label, val, step = 'any') => `<label for="${id}">${label}</label><input id="${id}" type="number" value="${val}" step="${step}" min="0">`;
  const sel = (id, label, opts) => `<label for="${id}">${label}</label><select id="${id}">${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  // Runs fn(outputElement) on the Go button; shows a friendly message on error.
  const act = (b, fn) => {
    $(b, '[data-go]').onclick = async () => {
      const o = $(b, '[data-out]');
      try { await fn(o); } catch (e) { o.textContent = 'Something went wrong. Please try again.'; }
    };
  };
  const fmtT = ms => {
    const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000);
    return pad(m) + ':' + pad(s) + '.' + pad(cs);
  };
  let stopFn = null;

  const TOOLS = window.DSTools = {
    'JPG / PNG to PDF': {
      html: `<p class="sub">Choose one or more photos. They become pages in one PDF.</p>
<label for="f">Photos</label><input id="f" type="file" accept="image/*" multiple>${go('Create PDF')}${out}`,
      init(b) {
        act(b, async o => {
          const files = [...$(b, '#f').files];
          if (!files.length) { o.textContent = 'Please choose at least one photo.'; return; }
          o.textContent = 'Creating PDF…';
          await load('jspdf', JSPDF);
          const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
          for (let i = 0; i < files.length; i++) {
            const img = await loadImg(files[i]);
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            c.getContext('2d').drawImage(img, 0, 0);
            const s = Math.min(190 / img.width, 277 / img.height), w = img.width * s, h = img.height * s;
            if (i) pdf.addPage();
            pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', (210 - w) / 2, (297 - h) / 2, w, h);
          }
          pdf.save('images.pdf');
          o.textContent = 'PDF downloaded with ' + files.length + ' page(s).';
        });
      }
    },

    'Photo Compressor (KB)': {
      html: `<p class="sub">Reduce a photo to about the size you need. The result may land a little under the target.</p>
<label for="f">Photo</label><input id="f" type="file" accept="image/*">
${num('kb', 'Target size (KB)', 100, '1')}${go('Compress and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0], target = Number($(b, '#kb').value) * 1024;
          if (!f || !target) { o.textContent = 'Choose a photo and a target size.'; return; }
          o.textContent = 'Compressing…';
          const img = await loadImg(f);
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          c.getContext('2d').drawImage(img, 0, 0);
          let lo = 0.05, hi = 0.95, best = null;
          for (let i = 0; i < 8; i++) {
            const q = (lo + hi) / 2, bl = await toBlob(c, 'image/jpeg', q);
            if (bl.size <= target) { best = bl; lo = q; } else { hi = q; }
          }
          best = best || await toBlob(c, 'image/jpeg', 0.05);
          saveBlob(best, 'compressed.jpg');
          o.textContent = 'Done: ' + Math.round(best.size / 1024) + ' KB.';
        });
      }
    },

    'Image Format Converter': {
      html: `<p class="sub">Convert between JPG, PNG and WebP.</p>
<label for="f">Image</label><input id="f" type="file" accept="image/*">
${sel('fmt', 'Output format', [['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']])}${go('Convert and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0], type = $(b, '#fmt').value;
          if (!f) { o.textContent = 'Choose an image first.'; return; }
          const img = await loadImg(f);
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const ctx = c.getContext('2d');
          if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0);
          const ext = type.split('/')[1].replace('jpeg', 'jpg');
          saveBlob(await toBlob(c, type, 0.92), 'converted.' + ext);
          o.textContent = 'Converted to ' + ext.toUpperCase() + '.';
        });
      }
    },

    'QR Code Generator': {
      html: `<label for="t">Text or link</label><input id="t" type="text" placeholder="https://example.com">
<p class="sub">Works with a URL, WhatsApp link, UPI ID or plain text.</p>${go('Generate')}${out}`,
      init(b) {
        act(b, async o => {
          const t = $(b, '#t').value.trim();
          if (!t) { o.textContent = 'Enter some text or a link.'; return; }
          await load('qr', QRLIB);
          const q = window.qrcode(0, 'M');
          q.addData(t); q.make();
          const url = q.createDataURL(8, 4);
          o.innerHTML = `<img alt="QR code" src="${url}" style="max-width:220px;background:#fff;border-radius:8px"><br><button type="button" class="btn o" data-dl style="margin-top:10px">Download PNG</button>`;
          $(b, '[data-dl]').onclick = () => { const a = document.createElement('a'); a.href = url; a.download = 'qr.png'; a.click(); };
        });
      }
    },

    'Word Counter': {
      html: `<label for="t">Your text</label><textarea id="t" rows="6" style="width:100%;font:inherit" placeholder="Paste or type text here"></textarea>
<div data-out style="margin-top:12px"></div>`,
      init(b) {
        const t = $(b, '#t'), o = $(b, '[data-out]');
        t.oninput = () => {
          const v = t.value;
          const words = (v.trim().match(/\S+/g) || []).length;
          const sentences = (v.match(/[.!?।]+/g) || []).length;
          const paras = v.trim() ? v.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
          o.innerHTML = `Words: <strong>${words}</strong><br>Characters: <strong>${v.length}</strong><br>Characters (no spaces): <strong>${v.replace(/\s/g, '').length}</strong><br>Sentences: <strong>${sentences}</strong><br>Paragraphs: <strong>${paras}</strong><br>Reading time: <strong>~${words ? Math.max(1, Math.round(words / 200)) : 0} min</strong>`;
        };
      }
    },

    'Age Calculator': {
      html: `<label for="d">Date of birth</label><input id="d" type="date">${go('Calculate')}${out}`,
      init(b) {
        act(b, o => {
          const v = $(b, '#d').value, now = new Date(), dob = new Date(v);
          if (!v || dob > now) { o.textContent = 'Enter a valid past date.'; return; }
          let y = now.getFullYear() - dob.getFullYear(), m = now.getMonth() - dob.getMonth(), d = now.getDate() - dob.getDate();
          if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
          if (m < 0) { y--; m += 12; }
          const days = Math.floor((now - dob) / 86400000);
          const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
          if (next < now) next.setFullYear(now.getFullYear() + 1);
          o.innerHTML = `Age: <strong>${y} years, ${m} months, ${d} days</strong><br>Total days lived: <strong>${days.toLocaleString('en-IN')}</strong><br>Next birthday in: <strong>${Math.ceil((next - now) / 86400000)} days</strong>`;
        });
      }
    },

    'GST Calculator': {
      html: `<label for="a">Amount (₹)</label><input id="a" type="number" value="1000" min="0" step="any">
${sel('r', 'GST rate (%)', [[0, '0'], [5, '5'], [12, '12'], [18, '18'], [28, '28']]).replace('<option value="28">', '<option value="28" selected>')}
${sel('m', 'Mode', [['excl', 'Add GST (exclusive)'], ['incl', 'Remove GST (inclusive)']])}${go('Calculate')}${out}`,
      init(b) {
        act(b, o => {
          const amt = Number($(b, '#a').value), rate = Number($(b, '#r').value), r = rate / 100;
          let base, tax, total;
          if ($(b, '#m').value === 'excl') { base = amt; tax = amt * r; total = amt + tax; }
          else { base = amt / (1 + r); tax = amt - base; total = amt; }
          o.innerHTML = `Base amount: <strong>${inr(base)}</strong><br>Total GST: <strong>${inr(tax)}</strong><br>CGST + SGST (each ${rate / 2}%): <strong>${inr(tax / 2)} each</strong><br>IGST (interstate): <strong>${inr(tax)}</strong><br>Total amount: <strong>${inr(total)}</strong>`;
        });
      }
    },

    'Loan / EMI Calculator': {
      html: `${num('p', 'Loan amount (₹)', 500000)}${num('r', 'Annual rate (%)', 9)}${num('n', 'Months', 60, '1')}${go('Calculate')}${out}`,
      init(b) {
        act(b, o => {
          const P = Number($(b, '#p').value), n = Number($(b, '#n').value), r = Number($(b, '#r').value) / 1200;
          if (!P || !n) { o.textContent = 'Enter the loan amount and months.'; return; }
          const emi = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
          const total = emi * n;
          o.innerHTML = `Monthly EMI: <strong>${inr(emi)}</strong><br>Total interest: <strong>${inr(total - P)}</strong><br>Total repayment: <strong>${inr(total)}</strong>`;
        });
      }
    },

    'Percentage Calculator': {
      html: `${num('x', 'Percent (%)', 18)}${num('y', 'Of number', 2500)}${go('Calculate')}${out}`,
      init(b) {
        act(b, o => {
          const x = Number($(b, '#x').value), y = Number($(b, '#y').value);
          o.innerHTML = `${x}% of ${y.toLocaleString('en-IN')} = <strong>${(x * y / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>`;
        });
      }
    },

    'Online Stopwatch': {
      html: `<div data-sw style="font-size:2.2rem;font-variant-numeric:tabular-nums;margin-top:8px">00:00.00</div>
<button type="button" class="btn" data-st>Start</button>
<button type="button" class="btn o" data-lap>Lap</button>
<button type="button" class="btn o" data-rs>Reset</button>
<div data-out style="margin-top:10px"></div>`,
      init(b) {
        let el = 0, t0 = 0, tm = null, laps = [];
        const d = $(b, '[data-sw]'), st = $(b, '[data-st]'), o = $(b, '[data-out]');
        const now = () => el + (tm ? Date.now() - t0 : 0);
        const show = () => { d.textContent = fmtT(now()); };
        stopFn = () => { clearInterval(tm); tm = null; };
        st.onclick = () => {
          if (tm) { clearInterval(tm); tm = null; el += Date.now() - t0; st.textContent = 'Start'; }
          else { t0 = Date.now(); tm = setInterval(show, 50); st.textContent = 'Pause'; }
          show();
        };
        $(b, '[data-lap]').onclick = () => {
          if (!tm) return;
          laps.push(fmtT(now()));
          o.innerHTML = laps.map((t, i) => `Lap ${i + 1}: <strong>${t}</strong>`).join('<br>');
        };
        $(b, '[data-rs]').onclick = () => {
          clearInterval(tm); tm = null; el = 0; laps = [];
          st.textContent = 'Start'; o.innerHTML = ''; show();
        };
      }
    },

    'Meta Title & Description Generator': {
      html: `<label for="ti">Page title</label><input id="ti" type="text" placeholder="Passport Photo Maker Online Free">
<p class="sub" data-tc>Keep it under 60 characters.</p>
<label for="de">Meta description</label><textarea id="de" rows="4" style="width:100%;font:inherit" placeholder="A short summary of the page"></textarea>
<p class="sub" data-dc>Keep it under 160 characters.</p>
<label for="ou">Page address (optional)</label><input id="ou" type="url" placeholder="https://yoursite.com/page">
<label for="og">Ready-to-paste tags</label><textarea id="og" rows="6" readonly style="width:100%;font:inherit"></textarea>`,
      init(b) {
        const ti = $(b, '#ti'), de = $(b, '#de'), ou = $(b, '#ou'), og = $(b, '#og');
        const update = () => {
          const t = ti.value.trim(), d = de.value.trim(), u = ou.value.trim();
          $(b, '[data-tc]').textContent = t.length + ' / 60 characters' + (t.length > 60 ? ' (may be cut off in Google)' : '');
          $(b, '[data-dc]').textContent = d.length + ' / 160 characters' + (d.length > 160 ? ' (may be cut off in Google)' : '');
          const lines = [
            `<title>${esc(t)}</title>`,
            `<meta name="description" content="${esc(d)}">`,
            `<meta property="og:title" content="${esc(t)}">`,
            `<meta property="og:description" content="${esc(d)}">`
          ];
          if (u) lines.push(`<meta property="og:url" content="${esc(u)}">`);
          og.value = lines.join('\n');
        };
        [ti, de, ou].forEach(i => { i.oninput = update; });
        update();
      }
    },

    'Name, Date & Text on Photo': {
      html: `<label for="f">Photo</label><input id="f" type="file" accept="image/*">
<label for="n">Name or text</label><input id="n" type="text" placeholder="Your name">
<label for="dt">Date</label><input id="dt" type="date">
<label for="cl">Text colour</label><input id="cl" type="color" value="#ffffff" style="height:44px;padding:4px">
${num('fs', 'Text size (% of photo width)', 5)}${go('Create image')}${out}`,
      init(b) {
        $(b, '#dt').value = new Date().toISOString().slice(0, 10);
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a photo first.'; return; }
          const img = await loadImg(f);
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const size = Math.max(8, img.width * (Number($(b, '#fs').value) || 5) / 100);
          const dv = $(b, '#dt').value;
          const dateTxt = dv ? dv.split('-').reverse().join('-') : '';
          const lines = [$(b, '#n').value.trim(), dateTxt].filter(Boolean);
          ctx.font = `700 ${size}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.lineJoin = 'round';
          ctx.lineWidth = size * 0.12;
          ctx.strokeStyle = 'rgba(0,0,0,.55)';
          ctx.fillStyle = $(b, '#cl').value;
          let y = c.height - size * 0.6;
          for (let i = lines.length - 1; i >= 0; i--) {
            ctx.strokeText(lines[i], c.width / 2, y);
            ctx.fillText(lines[i], c.width / 2, y);
            y -= size * 1.25;
          }
          saveBlob(await toBlob(c, 'image/png'), 'photo-with-text.png');
          o.textContent = 'Image downloaded.';
        });
      }
    }
  };

  function close() {
    if (stopFn) { stopFn(); stopFn = null; }
    const m = document.getElementById('tlm');
    if (m) m.classList.remove('open');
  }

  function open(name) {
    let m = document.getElementById('tlm');
    if (!m) {
      m = document.createElement('div');
      m.id = 'tlm';
      m.className = 'modal';
      m.innerHTML = '<div class="box" role="dialog" aria-modal="true" aria-labelledby="tlt" style="max-width:560px;max-height:92vh;overflow:auto">' +
        '<button class="x" type="button" aria-label="Close tool">✕</button>' +
        '<h2 id="tlt" style="font-size:1.25rem;padding-right:44px;color:#13233f"></h2>' +
        '<div id="tlb" style="margin-top:6px"></div></div>';
      document.body.appendChild(m);
      m.querySelector('.x').onclick = close;
      m.onclick = e => { if (e.target === m) close(); };
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    }
    close();
    const t = TOOLS[name] || { html: '<p class="sub">This tool is coming in the next update.</p>' };
    m.querySelector('#tlt').textContent = name;
    const body = m.querySelector('#tlb');
    body.innerHTML = t.html;
    if (t.init) t.init(body);
    m.classList.add('open');
    m.querySelector('.x').focus();
  }

  // Free tool cards open here, before the dashboard's generic card handler runs.
  // Tools the dashboard lists but that are not built yet still open this message.
  const COMING = ['Background Black & White', 'Background Remover'];
  const isFreeTool = name => Object.prototype.hasOwnProperty.call(TOOLS, name) || COMING.includes(name);
  const closePanels = () => {
    const sb = document.getElementById('sb'); if (sb) sb.classList.remove('open');
    const sp = document.getElementById('sP'); if (sp) sp.hidden = true;
  };

  window.addEventListener('click', e => {
    if (!e.target.closest) return;
    const card = e.target.closest('[data-tool]');
    if (card) { e.preventDefault(); e.stopPropagation(); open(card.dataset.tool); return; }
    // Logged-in dashboard: sidebar, search and "Trending" items use "Group|Tool name".
    const item = e.target.closest('[data-go],[data-it]');
    if (!item) return;
    const name = (item.dataset.go || item.dataset.it || '').split('|').slice(1).join('|');
    if (!isFreeTool(name)) return;
    e.preventDefault(); e.stopPropagation();
    closePanels();
    open(name);
  }, true);
})();

/* DocSmartly free tools, batch 2. Loads after tools.js. Runs in the browser; nothing is uploaded. */
(function () {
  'use strict';
  const TOOLS = window.DSTools;
  if (!TOOLS) return;

  const $ = (r, s) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const PDFLIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
  const ensure = (g, url) => window[g] ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.onload = res; s.onerror = () => rej(new Error(g));
    document.head.appendChild(s);
  });

  const go = label => `<button type="button" class="btn" data-go style="margin-top:12px">${label}</button>`;
  const out = '<p class="sub" data-out style="margin-top:12px"></p>';
  const hint = t => `<p class="sub">${t}</p>`;
  const lbl = (id, text) => `<label for="${id}">${text}</label>`;
  const inp = (id, text, type = 'text', val = '', extra = '') => `${lbl(id, text)}<input id="${id}" type="${type}" value="${esc(val)}"${extra}>`;
  const file = (id, text, accept, multi) => `${lbl(id, text)}<input id="${id}" type="file" accept="${accept}"${multi ? ' multiple' : ''}>`;
  const range = (id, text, min, max, val) => `${lbl(id, text)}<input id="${id}" type="range" min="${min}" max="${max}" value="${val}" style="width:100%">`;
  const area = (id, text, rows = 8) => `${lbl(id, text)}<textarea id="${id}" rows="${rows}" style="width:100%;font:inherit"></textarea>`;
  const act = (b, fn) => {
    $(b, '[data-go]').onclick = async () => {
      const o = $(b, '[data-out]');
      try { await fn(o); } catch (e) { o.textContent = 'Something went wrong. Please check the file and try again.'; }
    };
  };
  const saveBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const loadImg = f => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f);
  });
  const toBlob = (c, t, q) => new Promise(r => c.toBlob(r, t, q));
  const canvasFrom = img => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    return c;
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const money = n => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Invoice and quotation share one generator. Amounts use "Rs." because the PDF's built-in font has no ₹ symbol.
  const docMaker = (title, noLabel, noDefault) => {
    const items = [1, 2, 3, 4].map(i =>
      `${inp('d' + i, 'Item ' + i + ' description')}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${inp('q' + i, 'Qty', 'number', '', ' min="0"')}${inp('r' + i, 'Rate (Rs.)', 'number', '', ' min="0" step="any"')}</div>`).join('\n');
    return {
      html: `${hint('Fill in your details and up to four items. Leave unused rows empty.')}
${inp('sn', 'Your business name')}${inp('sg', 'Your GSTIN (optional)')}
${inp('bn', 'Customer name')}${inp('no', noLabel, 'text', noDefault)}${inp('dt', 'Date', 'date', today())}
${items}
<label for="g">GST rate (%)</label><select id="g">${[0, 5, 12, 18, 28].map(r => `<option value="${r}"${r === 18 ? ' selected' : ''}>${r}</option>`).join('')}</select>
${go('Create PDF')}${out}`,
      init(b) {
        act(b, async o => {
          const v = id => $(b, '#' + id).value.trim();
          const rows = [];
          for (let i = 1; i <= 4; i++) {
            const d = v('d' + i), q = Number(v('q' + i)) || 0, r = Number(v('r' + i)) || 0;
            if (d || r) rows.push({ d, q, r, a: q * r });
          }
          if (!rows.length) { o.textContent = 'Add at least one item.'; return; }
          await ensure('jspdf', JSPDF);
          const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.text(title.toUpperCase(), 20, 24);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold'); pdf.text(v('sn') || 'Your business', 20, 34);
          pdf.setFont('helvetica', 'normal');
          if (v('sg')) pdf.text('GSTIN: ' + v('sg'), 20, 39);
          pdf.text('Bill to: ' + (v('bn') || '-'), 20, 48);
          pdf.text(noLabel + ': ' + (v('no') || '-'), 190, 34, { align: 'right' });
          pdf.text('Date: ' + (v('dt') || '-'), 190, 39, { align: 'right' });
          let y = 62;
          pdf.setFont('helvetica', 'bold');
          pdf.text('Description', 20, y); pdf.text('Qty', 125, y, { align: 'right' });
          pdf.text('Rate', 158, y, { align: 'right' }); pdf.text('Amount', 190, y, { align: 'right' });
          pdf.line(20, y + 2, 190, y + 2);
          pdf.setFont('helvetica', 'normal');
          y += 9;
          rows.forEach(x => {
            pdf.text(x.d || '-', 20, y);
            pdf.text(String(x.q), 125, y, { align: 'right' });
            pdf.text(x.r.toFixed(2), 158, y, { align: 'right' });
            pdf.text(x.a.toFixed(2), 190, y, { align: 'right' });
            y += 7;
          });
          const sub = rows.reduce((s, x) => s + x.a, 0), tax = sub * Number($(b, '#g').value) / 100;
          y += 3; pdf.line(120, y, 190, y); y += 7;
          pdf.text('Subtotal', 150, y, { align: 'right' }); pdf.text(money(sub), 190, y, { align: 'right' }); y += 6;
          pdf.text('GST (' + $(b, '#g').value + '%)', 150, y, { align: 'right' }); pdf.text(money(tax), 190, y, { align: 'right' }); y += 6;
          pdf.setFont('helvetica', 'bold');
          pdf.text('Total', 150, y, { align: 'right' }); pdf.text(money(sub + tax), 190, y, { align: 'right' });
          pdf.save(title.toLowerCase() + '-' + (v('no') || 'draft').replace(/\s+/g, '-') + '.pdf');
          o.textContent = title + ' PDF downloaded.';
        });
      }
    };
  };

  Object.assign(TOOLS, {
    'Invoice Maker': docMaker('Invoice', 'Invoice no', 'INV-001'),
    'Quotation Maker': docMaker('Quotation', 'Quotation no', 'QTN-001'),

    'Text to PDF / Application': {
      html: `${inp('ti', 'Title (optional)')}${area('t', 'Your text', 10)}
${hint('English text only for now. Hindi needs a Devanagari font, which this tool does not include yet.')}${go('Create PDF')}${out}`,
      init(b) {
        act(b, async o => {
          const txt = $(b, '#t').value.trim(), title = $(b, '#ti').value.trim();
          if (!txt) { o.textContent = 'Write something first.'; return; }
          await ensure('jspdf', JSPDF);
          const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
          let y = 25;
          if (title) { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.text(title, 20, y); y += 10; }
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11);
          pdf.splitTextToSize(txt, 170).forEach(line => {
            if (y > 280) { pdf.addPage(); y = 20; }
            pdf.text(line, 20, y); y += 6;
          });
          pdf.save((title || 'document').replace(/\s+/g, '-') + '.pdf');
          o.textContent = 'PDF downloaded.';
        });
      }
    },

    'PDF Merge': {
      html: `${file('f', 'PDF files (select several; they merge in the order shown)', 'application/pdf', true)}${go('Merge and download')}${out}`,
      init(b) {
        act(b, async o => {
          const files = [...$(b, '#f').files];
          if (files.length < 2) { o.textContent = 'Choose at least two PDF files.'; return; }
          o.textContent = 'Merging…';
          await ensure('PDFLib', PDFLIB);
          const { PDFDocument } = window.PDFLib;
          const merged = await PDFDocument.create();
          for (const f of files) {
            const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
            const pages = await merged.copyPages(src, src.getPageIndices());
            pages.forEach(p => merged.addPage(p));
          }
          saveBlob(new Blob([await merged.save()], { type: 'application/pdf' }), 'merged.pdf');
          o.textContent = 'Merged ' + files.length + ' files.';
        });
      }
    },

    'PDF Split & Page Extract': {
      html: `${file('f', 'PDF file', 'application/pdf')}${inp('pr', 'Pages to keep (for example 1-3,5,8-10)')}${go('Extract pages')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a PDF first.'; return; }
          await ensure('PDFLib', PDFLIB);
          const { PDFDocument } = window.PDFLib;
          const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
          const n = src.getPageCount(), idx = [];
          const parts = $(b, '#pr').value.split(',').map(s => s.trim()).filter(Boolean);
          if (!parts.length) { o.textContent = 'Enter the pages to keep, for example 1-3,5.'; return; }
          for (const part of parts) {
            const m = part.match(/^(\d+)(?:-(\d+))?$/);
            if (!m) { o.textContent = 'Check the page list, for example 1-3,5,8-10.'; return; }
            const a = +m[1], z = m[2] ? +m[2] : a;
            if (a < 1 || z > n || a > z) { o.textContent = 'Pages must be between 1 and ' + n + '.'; return; }
            for (let p = a; p <= z; p++) idx.push(p - 1);
          }
          const dst = await PDFDocument.create();
          (await dst.copyPages(src, idx)).forEach(p => dst.addPage(p));
          saveBlob(new Blob([await dst.save()], { type: 'application/pdf' }), 'extracted.pdf');
          o.textContent = 'Extracted ' + idx.length + ' page(s) of ' + n + '.';
        });
      }
    },

    'PDF Page Number Adder': {
      html: `${file('f', 'PDF file', 'application/pdf')}${inp('fmt', 'Format ({n} = page, {t} = total)', 'text', 'Page {n} of {t}')}${inp('sz', 'Font size', 'number', '10', ' min="6" max="30"')}${go('Add page numbers')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a PDF first.'; return; }
          await ensure('PDFLib', PDFLIB);
          const { PDFDocument, StandardFonts } = window.PDFLib;
          const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
          const font = await doc.embedFont(StandardFonts.Helvetica);
          const pages = doc.getPages(), total = pages.length;
          const size = Number($(b, '#sz').value) || 10, fmt = $(b, '#fmt').value;
          pages.forEach((p, i) => {
            const txt = fmt.split('{n}').join(String(i + 1)).split('{t}').join(String(total));
            const w = font.widthOfTextAtSize(txt, size);
            p.drawText(txt, { x: (p.getWidth() - w) / 2, y: 18, size, font });
          });
          saveBlob(new Blob([await doc.save()], { type: 'application/pdf' }), 'numbered.pdf');
          o.textContent = 'Added numbers to ' + total + ' page(s).';
        });
      }
    },

    'Image to Black & White': {
      html: `${file('f', 'Photo', 'image/*')}${range('c', 'Contrast (%)', 50, 200, 100)}${go('Convert and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a photo first.'; return; }
          const img = await loadImg(f), c = canvasFrom(img), ctx = c.getContext('2d');
          if (!('filter' in ctx)) { o.textContent = 'This effect needs Chrome, Edge or Firefox.'; return; }
          ctx.filter = `grayscale(100%) contrast(${$(b, '#c').value}%)`;
          ctx.drawImage(img, 0, 0);
          saveBlob(await toBlob(c, 'image/jpeg', 0.92), 'black-and-white.jpg');
          o.textContent = 'Black & white image downloaded.';
        });
      }
    },

    'Photo Color Changer': {
      html: `${file('f', 'Photo', 'image/*')}${range('br', 'Brightness (%)', 50, 150, 100)}${range('ct', 'Contrast (%)', 50, 150, 100)}${range('sa', 'Saturation (%)', 0, 200, 100)}${range('se', 'Sepia / warm tone (%)', 0, 100, 0)}${go('Apply and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a photo first.'; return; }
          const img = await loadImg(f), c = canvasFrom(img), ctx = c.getContext('2d');
          if (!('filter' in ctx)) { o.textContent = 'This effect needs Chrome, Edge or Firefox.'; return; }
          ctx.filter = `brightness(${$(b, '#br').value}%) contrast(${$(b, '#ct').value}%) saturate(${$(b, '#sa').value}%) sepia(${$(b, '#se').value}%)`;
          ctx.drawImage(img, 0, 0);
          saveBlob(await toBlob(c, 'image/jpeg', 0.92), 'color-adjusted.jpg');
          o.textContent = 'Image downloaded.';
        });
      }
    },

    'Photo Blur Tool': {
      html: `${file('f', 'Photo', 'image/*')}${range('px', 'Blur strength (px)', 0, 20, 4)}
${hint('This blurs the whole photo. Blurring only a chosen area is coming in a later update.')}${go('Blur and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a photo first.'; return; }
          const img = await loadImg(f), c = canvasFrom(img), ctx = c.getContext('2d');
          if (!('filter' in ctx)) { o.textContent = 'This effect needs Chrome, Edge or Firefox.'; return; }
          ctx.filter = `blur(${$(b, '#px').value}px)`;
          ctx.drawImage(img, 0, 0);
          saveBlob(await toBlob(c, 'image/jpeg', 0.92), 'blurred.jpg');
          o.textContent = 'Blurred image downloaded.';
        });
      }
    },

    'Image Watermark Maker': {
      html: `${file('f', 'Photo', 'image/*')}${inp('wt', 'Watermark text', 'text', '© Your Name')}
${range('op', 'Opacity (%)', 10, 80, 35)}${range('sz', 'Text size (% of photo width)', 2, 10, 5)}${go('Add watermark and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0], t = $(b, '#wt').value.trim();
          if (!f) { o.textContent = 'Choose a photo first.'; return; }
          if (!t) { o.textContent = 'Enter the watermark text.'; return; }
          const img = await loadImg(f), c = canvasFrom(img), ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const op = Number($(b, '#op').value) / 100, size = Math.max(14, img.width * Number($(b, '#sz').value) / 100);
          ctx.font = `700 ${size}px system-ui, sans-serif`;
          ctx.fillStyle = `rgba(255,255,255,${op})`;
          ctx.strokeStyle = `rgba(0,0,0,${op / 2})`;
          ctx.lineWidth = size * 0.06;
          ctx.translate(c.width / 2, c.height / 2);
          ctx.rotate(-Math.PI / 6);
          const span = Math.max(c.width, c.height) * 1.2, stepY = size * 4, stepX = ctx.measureText(t).width * 1.4;
          for (let y = -span; y < span; y += stepY) {
            for (let x = -span; x < span; x += stepX) { ctx.strokeText(t, x, y); ctx.fillText(t, x, y); }
          }
          saveBlob(await toBlob(c, 'image/jpeg', 0.92), 'watermarked.jpg');
          o.textContent = 'Watermarked image downloaded.';
        });
      }
    },

    'Photo & Signature Resizer': {
      html: `${file('f', 'Photo or signature', 'image/*')}${inp('w', 'Width (px)', 'number', '300', ' min="10"')}${inp('h', 'Height (px)', 'number', '350', ' min="10"')}
<label for="md">Mode</label><select id="md"><option value="fit">Fit inside, white background</option><option value="stretch">Stretch to exact size</option></select>${go('Resize and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a photo or signature first.'; return; }
          const W = Number($(b, '#w').value), H = Number($(b, '#h').value);
          if (!W || !H) { o.textContent = 'Enter the width and height in pixels.'; return; }
          const img = await loadImg(f), c = document.createElement('canvas');
          c.width = W; c.height = H;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
          if ($(b, '#md').value === 'stretch') ctx.drawImage(img, 0, 0, W, H);
          else {
            const s = Math.min(W / img.width, H / img.height), dw = img.width * s, dh = img.height * s;
            ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
          }
          saveBlob(await toBlob(c, 'image/jpeg', 0.95), 'resized-' + W + 'x' + H + '.jpg');
          o.textContent = 'Resized to ' + W + ' × ' + H + ' px.';
        });
      }
    },

    'Instagram Reel Cover Maker': {
      html: `${file('f', 'Photo', 'image/*')}${inp('tt', 'Cover text (optional)')}
${hint('Makes a 1080 × 1920 cover. The photo fills the frame and is cropped from the centre.')}${go('Create cover and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a photo first.'; return; }
          const img = await loadImg(f), c = document.createElement('canvas');
          c.width = 1080; c.height = 1920;
          const ctx = c.getContext('2d');
          const s = Math.max(1080 / img.width, 1920 / img.height), dw = img.width * s, dh = img.height * s;
          ctx.drawImage(img, (1080 - dw) / 2, (1920 - dh) / 2, dw, dh);
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, 0, 1080, 1920);
          const t = $(b, '#tt').value.trim();
          if (t) {
            ctx.font = '800 110px system-ui, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24;
            const words = t.split(/\s+/), lines = [];
            let cur = '';
            words.forEach(w => {
              const test = cur ? cur + ' ' + w : w;
              if (ctx.measureText(test).width > 900 && cur) { lines.push(cur); cur = w; } else cur = test;
            });
            if (cur) lines.push(cur);
            const top = 960 - (lines.length - 1) * 70;
            lines.forEach((line, i) => ctx.fillText(line, 540, top + i * 140));
          }
          saveBlob(await toBlob(c, 'image/jpeg', 0.92), 'reel-cover.jpg');
          o.textContent = 'Reel cover downloaded.';
        });
      }
    }
  });
})();

/* DocSmartly free tools, batch 3. Loads after tools-2.js. Runs in the browser; nothing is uploaded. */
(function () {
  'use strict';
  const TOOLS = window.DSTools;
  if (!TOOLS) return;

  const $ = (r, s) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const PDFLIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  const ensure = (g, url) => window[g] ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.onload = res; s.onerror = () => rej(new Error(g));
    document.head.appendChild(s);
  });

  const go = label => `<button type="button" class="btn" data-go style="margin-top:12px">${label}</button>`;
  const out = '<p class="sub" data-out style="margin-top:12px"></p>';
  const hint = t => `<p class="sub">${t}</p>`;
  const lbl = (id, text) => `<label for="${id}">${text}</label>`;
  const inp = (id, text, type = 'text', val = '', extra = '') => `${lbl(id, text)}<input id="${id}" type="${type}" value="${esc(val)}"${extra}>`;
  const file = (id, text, accept) => `${lbl(id, text)}<input id="${id}" type="file" accept="${accept}">`;
  const area = (id, text, rows = 4) => `${lbl(id, text)}<textarea id="${id}" rows="${rows}" style="width:100%;font:inherit"></textarea>`;
  const act = (b, fn) => {
    $(b, '[data-go]').onclick = async () => {
      const o = $(b, '[data-out]');
      try { await fn(o); } catch (e) { o.textContent = 'Something went wrong. Please check the file and try again.'; }
    };
  };
  const saveBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const loadImg = f => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f);
  });
  const toBlob = (c, t, q) => new Promise(r => c.toBlob(r, t, q));
  const money = n => 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = v => Number(v) || 0;
  const hexToRgb = h => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
    const n = m ? parseInt(m[1], 16) : 0x2457d6;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const toHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

  Object.assign(TOOLS, {
    'PDF to JPG': {
      html: `${file('f', 'PDF file', 'application/pdf')}${inp('dpi', 'Resolution (dpi, 72 to 300)', 'number', '150', ' min="72" max="300"')}
${hint('Each page becomes one JPG. All pages download together in one ZIP file.')}${go('Convert and download ZIP')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a PDF first.'; return; }
          await ensure('pdfjsLib', PDFJS);
          await ensure('JSZip', JSZIP);
          const lib = window.pdfjsLib;
          lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
          const pdf = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
          const zip = new window.JSZip(), scale = Math.min(300, Math.max(72, num($(b, '#dpi').value) || 150)) / 72;
          for (let i = 1; i <= pdf.numPages; i++) {
            o.textContent = 'Converting page ' + i + ' of ' + pdf.numPages + '…';
            const page = await pdf.getPage(i), vp = page.getViewport({ scale });
            const c = document.createElement('canvas');
            c.width = vp.width; c.height = vp.height;
            await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            zip.file('page-' + i + '.jpg', await toBlob(c, 'image/jpeg', 0.92));
          }
          saveBlob(await zip.generateAsync({ type: 'blob' }), 'pdf-pages.zip');
          o.textContent = 'Done: ' + pdf.numPages + ' page(s) in a ZIP file.';
        });
      }
    },

    'PDF Rotate & Reorder': {
      html: `${file('f', 'PDF file', 'application/pdf')}
<label for="rot">Rotate all pages</label><select id="rot"><option value="0">No rotation</option><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">90° anticlockwise</option></select>
${inp('ord', 'Page order, for example 3,1,2 (leave empty to keep the original order)')}
${hint('Pages not listed are removed. Example: "2,1" keeps pages 2 and 1 and drops the rest.')}${go('Create PDF')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a PDF first.'; return; }
          await ensure('PDFLib', PDFLIB);
          const { PDFDocument, degrees } = window.PDFLib;
          const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
          const n = src.getPageCount(), raw = $(b, '#ord').value.trim();
          let idx = [];
          if (!raw) idx = Array.from({ length: n }, (_, i) => i);
          else {
            for (const part of raw.split(',').map(s => s.trim()).filter(Boolean)) {
              const p = Number(part);
              if (!Number.isInteger(p) || p < 1 || p > n) { o.textContent = 'Page numbers must be between 1 and ' + n + '.'; return; }
              idx.push(p - 1);
            }
          }
          const turn = num($(b, '#rot').value);
          const dst = await PDFDocument.create();
          const pages = await dst.copyPages(src, idx);
          pages.forEach(p => {
            p.setRotation(degrees((p.getRotation().angle + turn) % 360));
            dst.addPage(p);
          });
          saveBlob(new Blob([await dst.save()], { type: 'application/pdf' }), 'rotated-reordered.pdf');
          o.textContent = 'Created a PDF with ' + idx.length + ' page(s).';
        });
      }
    },

    'PDF Header & Footer Maker': {
      html: `${file('f', 'PDF file', 'application/pdf')}${inp('hd', 'Header text (optional)')}${inp('ft', 'Footer text (optional)')}
${hint('Use {n} for the page number and {t} for the total pages.')}${inp('sz', 'Font size', 'number', '9', ' min="6" max="18"')}${go('Add header and footer')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a PDF first.'; return; }
          await ensure('PDFLib', PDFLIB);
          const { PDFDocument, StandardFonts } = window.PDFLib;
          const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
          const font = await doc.embedFont(StandardFonts.Helvetica);
          const hd = $(b, '#hd').value.trim(), ft = $(b, '#ft').value.trim(), size = num($(b, '#sz').value) || 9;
          const fill = (s, i, t) => s.split('{n}').join(String(i + 1)).split('{t}').join(String(t));
          const total = doc.getPageCount();
          doc.getPages().forEach((p, i) => {
            const { width, height } = p.getSize();
            [[hd, height - 24], [ft, 16]].forEach(([txt, y]) => {
              if (!txt) return;
              const s = fill(txt, i, total), w = font.widthOfTextAtSize(s, size);
              p.drawText(s, { x: (width - w) / 2, y, size, font });
            });
          });
          saveBlob(new Blob([await doc.save()], { type: 'application/pdf' }), 'with-header-footer.pdf');
          o.textContent = 'Header and footer added to ' + total + ' page(s).';
        });
      }
    },

    'Color Picker from Image': {
      html: `${file('f', 'Photo', 'image/*')}
<canvas data-cv style="display:block;max-width:100%;margin-top:10px;border-radius:8px;cursor:crosshair;touch-action:none"></canvas>
${hint('Tap or click anywhere on the photo to read its colour.')}
<div data-out style="margin-top:12px"></div>`,
      init(b) {
        const cv = $(b, '[data-cv]'), o = $(b, '[data-out]'), ctx = cv.getContext('2d', { willReadFrequently: true });
        $(b, '#f').onchange = async () => {
          const f = $(b, '#f').files[0];
          if (!f) return;
          const img = await loadImg(f);
          cv.width = img.width; cv.height = img.height;
          ctx.drawImage(img, 0, 0);
          o.textContent = 'Tap a spot on the photo.';
        };
        const pick = e => {
          if (!cv.width) return;
          const rect = cv.getBoundingClientRect();
          const x = Math.floor((e.clientX - rect.left) * cv.width / rect.width);
          const y = Math.floor((e.clientY - rect.top) * cv.height / rect.height);
          const [r, g, bl] = ctx.getImageData(x, y, 1, 1).data;
          const hex = toHex(r, g, bl);
          const rn = r / 255, gn = g / 255, bn = bl / 255;
          const mx = Math.max(rn, gn, bn), mn = Math.min(rn, gn, bn), d = mx - mn;
          let h = 0, s = 0; const l = (mx + mn) / 2;
          if (d) {
            s = d / (1 - Math.abs(2 * l - 1));
            if (mx === rn) h = ((gn - bn) / d) % 6; else if (mx === gn) h = (bn - rn) / d + 2; else h = (rn - gn) / d + 4;
            h = Math.round(h * 60); if (h < 0) h += 360;
          }
          o.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><div style="width:56px;height:56px;border-radius:10px;border:1px solid #dbe5f6;background:${hex}"></div>
<div>HEX: <strong>${hex.toUpperCase()}</strong><br>RGB: <strong>${r}, ${g}, ${bl}</strong><br>HSL: <strong>${h}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%</strong></div></div>`;
        };
        cv.addEventListener('click', pick);
      }
    },

    'Digital Signature Maker': {
      html: `<p class="sub">Draw your signature with a mouse, finger or pen.</p>
<canvas data-sig width="600" height="220" style="width:100%;max-width:600px;height:auto;aspect-ratio:600/220;touch-action:none;border:1.5px dashed #bfd0f3;border-radius:10px;background:repeating-conic-gradient(#f1f4fa 0 25%,#fff 0 50%) 0 0/16px 16px"></canvas>
<div style="display:flex;gap:8px"><button type="button" class="btn o" data-clr style="margin-top:12px">Clear</button><button type="button" class="btn" data-go style="margin-top:12px">Download PNG</button></div>
<p class="sub" data-out style="margin-top:12px"></p>`,
      init(b) {
        const cv = $(b, '[data-sig]'), ctx = cv.getContext('2d');
        let drawing = false, last = null, any = false;
        ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#13233f';
        const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
        cv.onpointerdown = e => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); };
        cv.onpointermove = e => {
          if (!drawing) return;
          const p = pos(e);
          ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
          last = p; any = true;
        };
        const end = () => { drawing = false; };
        cv.onpointerup = end; cv.onpointercancel = end;
        $(b, '[data-clr]').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); any = false; $(b, '[data-out]').textContent = ''; };
        $(b, '[data-go]').onclick = async () => {
          const o = $(b, '[data-out]');
          if (!any) { o.textContent = 'Sign in the box first.'; return; }
          saveBlob(await toBlob(cv, 'image/png'), 'signature.png');
          o.textContent = 'Signature downloaded with a transparent background.';
        };
      }
    },

    'Photo Border Maker': {
      html: `${file('f', 'Photo', 'image/*')}${inp('bw', 'Border width (px)', 'number', '20', ' min="1" max="400"')}
${inp('bc', 'Border colour', 'color', '#2457d6', ' style="height:44px;padding:4px"')}${go('Add border and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a photo first.'; return; }
          const img = await loadImg(f), bw = Math.max(1, num($(b, '#bw').value) || 20);
          const c = document.createElement('canvas');
          c.width = img.width + bw * 2; c.height = img.height + bw * 2;
          const ctx = c.getContext('2d');
          ctx.fillStyle = $(b, '#bc').value;
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, bw, bw);
          saveBlob(await toBlob(c, 'image/jpeg', 0.92), 'bordered.jpg');
          o.textContent = 'Bordered photo downloaded.';
        });
      }
    },

    'Letterhead Maker': {
      html: `${inp('co', 'Company name')}${inp('tg', 'Tagline (optional)')}${area('ad', 'Address', 2)}
${inp('ph', 'Phone')}${inp('em', 'Email')}${inp('wb', 'Website (optional)')}${inp('gs', 'GSTIN (optional)')}
${inp('ac', 'Accent colour', 'color', '#2457d6', ' style="height:44px;padding:4px"')}${go('Create letterhead PDF')}${out}`,
      init(b) {
        act(b, async o => {
          const v = id => $(b, '#' + id).value.trim();
          if (!v('co')) { o.textContent = 'Enter the company name.'; return; }
          await ensure('jspdf', JSPDF);
          const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
          const [r, g, bl] = hexToRgb($(b, '#ac').value);
          pdf.setFillColor(r, g, bl); pdf.rect(0, 0, 210, 14, 'F');
          pdf.setTextColor(r, g, bl); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20);
          pdf.text(v('co'), 20, 34);
          pdf.setTextColor(90, 100, 120); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
          let y = 41;
          if (v('tg')) { pdf.text(v('tg'), 20, y); y += 5; }
          v('ad').split('\n').filter(Boolean).forEach(l => { pdf.text(l, 20, y); y += 5; });
          const contact = [v('ph') && 'Phone: ' + v('ph'), v('em') && 'Email: ' + v('em'), v('wb')].filter(Boolean).join('   |   ');
          if (contact) { pdf.text(contact, 20, y); y += 5; }
          if (v('gs')) { pdf.text('GSTIN: ' + v('gs'), 20, y); }
          pdf.setDrawColor(r, g, bl); pdf.setLineWidth(0.6); pdf.line(20, 287, 190, 287);
          pdf.setFontSize(8); pdf.text(v('co') + (v('wb') ? '  •  ' + v('wb') : ''), 105, 292, { align: 'center' });
          pdf.save(v('co').replace(/\s+/g, '-').toLowerCase() + '-letterhead.pdf');
          o.textContent = 'Letterhead PDF downloaded.';
        });
      }
    },

    'Resume Maker': {
      html: `${inp('nm', 'Full name')}${inp('jt', 'Job title')}${inp('cn', 'Phone, email and city')}
${area('su', 'Summary (2 to 4 lines)', 3)}${area('ex', 'Experience (one job per line: Role | Company | Years)', 4)}
${area('ed', 'Education (one per line)', 3)}${inp('sk', 'Skills (comma separated)')}${go('Create resume PDF')}${out}`,
      init(b) {
        act(b, async o => {
          const v = id => $(b, '#' + id).value.trim();
          if (!v('nm')) { o.textContent = 'Enter your name.'; return; }
          await ensure('jspdf', JSPDF);
          const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
          let y = 22;
          const need = h => { if (y + h > 282) { pdf.addPage(); y = 20; } };
          const heading = t => {
            need(14);
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(36, 87, 214);
            pdf.text(t.toUpperCase(), 20, y); y += 2;
            pdf.setDrawColor(219, 229, 246); pdf.line(20, y, 190, y); y += 6;
            pdf.setTextColor(19, 35, 63); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10.5);
          };
          const para = t => pdf.splitTextToSize(t, 170).forEach(l => { need(6); pdf.text(l, 20, y); y += 5.5; });
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(19, 35, 63);
          pdf.text(v('nm'), 20, y); y += 9;
          if (v('jt')) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12); pdf.setTextColor(36, 87, 214); pdf.text(v('jt'), 20, y); y += 7; }
          if (v('cn')) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(90, 100, 120); pdf.text(v('cn'), 20, y); y += 8; }
          if (v('su')) { heading('Summary'); para(v('su')); y += 3; }
          if (v('ex')) {
            heading('Experience');
            v('ex').split('\n').filter(Boolean).forEach(line => {
              const parts = line.split('|').map(s => s.trim());
              need(8);
              pdf.setFont('helvetica', 'bold'); pdf.text(parts[0] || '', 20, y);
              pdf.setFont('helvetica', 'normal'); pdf.text([parts[1], parts[2]].filter(Boolean).join('  •  '), 190, y, { align: 'right' });
              y += 6;
            });
            y += 3;
          }
          if (v('ed')) { heading('Education'); v('ed').split('\n').filter(Boolean).forEach(l => { need(6); pdf.text('• ' + l, 20, y); y += 5.5; }); y += 3; }
          if (v('sk')) { heading('Skills'); para(v('sk').split(',').map(s => s.trim()).filter(Boolean).join('  •  ')); }
          pdf.save(v('nm').replace(/\s+/g, '-').toLowerCase() + '-resume.pdf');
          o.textContent = 'Resume PDF downloaded.';
        });
      }
    },

    'Cash Denomination Calculator': {
      html: `<p class="sub">Enter how many notes and coins you have of each value.</p>
${[500, 200, 100, 50, 20, 10, 5, 2, 1].map(d => inp('c' + d, '₹' + d + ' count', 'number', '0', ' min="0"')).join('\n')}
${go('Calculate total')}${out}`,
      init(b) {
        act(b, o => {
          const rows = [500, 200, 100, 50, 20, 10, 5, 2, 1].map(d => {
            const n = Math.max(0, Math.floor(num($(b, '#c' + d).value)));
            return { d, n, amt: d * n };
          });
          const grand = rows.reduce((s, r) => s + r.amt, 0), notes = rows.filter(r => r.d >= 10).reduce((s, r) => s + r.n, 0), coins = rows.filter(r => r.d < 10).reduce((s, r) => s + r.n, 0);
          o.innerHTML = rows.filter(r => r.n).map(r => `₹${r.d} × ${r.n} = <strong>₹${r.amt.toLocaleString('en-IN')}</strong>`).join('<br>') +
            `<br><br>Notes: <strong>${notes}</strong> &nbsp; Coins: <strong>${coins}</strong><br>Grand total: <strong>₹${grand.toLocaleString('en-IN')}</strong>`;
        });
      }
    },

    'Salary Calculator': {
      html: `${inp('ba', 'Basic salary (monthly, ₹)', 'number', '15000', ' min="0"')}${inp('hr', 'HRA (monthly, ₹)', 'number', '6000', ' min="0"')}
${inp('al', 'Other allowances (monthly, ₹)', 'number', '2000', ' min="0"')}${inp('pf', 'PF rate on basic (%)', 'number', '12', ' min="0" max="12" step="0.1"')}
${inp('pt', 'Professional tax (monthly, ₹)', 'number', '200', ' min="0"')}
${hint('An estimate only. Income tax, ESI and employer contributions are not included.')}${go('Calculate')}${out}`,
      init(b) {
        act(b, o => {
          const basic = num($(b, '#ba').value), gross = basic + num($(b, '#hr').value) + num($(b, '#al').value);
          const pf = basic * num($(b, '#pf').value) / 100, pt = num($(b, '#pt').value), ded = pf + pt, net = gross - ded;
          o.innerHTML = `Gross monthly: <strong>${money(gross)}</strong><br>PF deduction: <strong>${money(pf)}</strong><br>Professional tax: <strong>${money(pt)}</strong><br>Total deductions: <strong>${money(ded)}</strong><br>Take-home monthly: <strong>${money(net)}</strong><br>Take-home yearly: <strong>${money(net * 12)}</strong>`;
        });
      }
    },

    'GST Inclusive & Exclusive Calculator': {
      html: `${inp('a', 'Amount (₹)', 'number', '1000', ' min="0" step="any"')}
<label for="r">GST rate (%)</label><select id="r">${[0, 5, 12, 18, 28].map(x => `<option value="${x}"${x === 18 ? ' selected' : ''}>${x}</option>`).join('')}</select>
<label for="m">Amount is</label><select id="m"><option value="excl">Without GST (add GST)</option><option value="incl">Including GST (remove GST)</option></select>
${go('Calculate')}${out}`,
      init(b) {
        act(b, o => {
          const amt = num($(b, '#a').value), rate = num($(b, '#r').value), r = rate / 100;
          let base, tax, total;
          if ($(b, '#m').value === 'excl') { base = amt; tax = amt * r; total = amt + tax; }
          else { base = amt / (1 + r); tax = amt - base; total = amt; }
          o.innerHTML = `Base value: <strong>${money(base)}</strong><br>Total GST: <strong>${money(tax)}</strong><br>CGST + SGST (each ${rate / 2}%): <strong>${money(tax / 2)} each</strong><br>IGST (interstate): <strong>${money(tax)}</strong><br>Total including GST: <strong>${money(total)}</strong>`;
        });
      }
    },

    'Printing Cost Calculator': {
      html: `${inp('bp', 'Black & white pages', 'number', '100', ' min="0"')}${inp('br', 'B&W rate per page (₹)', 'number', '1', ' min="0" step="any"')}
${inp('cp', 'Colour pages', 'number', '0', ' min="0"')}${inp('cr', 'Colour rate per page (₹)', 'number', '10', ' min="0" step="any"')}
${inp('cc', 'Copies', 'number', '1', ' min="1"')}${inp('bd', 'Binding / lamination per copy (₹)', 'number', '0', ' min="0" step="any"')}
${inp('ad', 'Advance paid (₹)', 'number', '0', ' min="0" step="any"')}${go('Calculate')}${out}`,
      init(b) {
        act(b, o => {
          const copies = Math.max(1, Math.floor(num($(b, '#cc').value)));
          const perCopy = num($(b, '#bp').value) * num($(b, '#br').value) + num($(b, '#cp').value) * num($(b, '#cr').value) + num($(b, '#bd').value);
          const total = perCopy * copies, due = total - num($(b, '#ad').value);
          o.innerHTML = `Cost per copy: <strong>${money(perCopy)}</strong><br>Copies: <strong>${copies}</strong><br>Total: <strong>${money(total)}</strong><br>Balance due: <strong>${money(due)}</strong>`;
        });
      }
    }
  });
})();

/* DocSmartly free tools, batch 4. Loads after tools-3.js. Runs in the browser; nothing is uploaded. */
(function () {
  'use strict';
  const TOOLS = window.DSTools;
  if (!TOOLS) return;

  const $ = (r, s) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  const ensure = (g, url) => window[g] ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.onload = res; s.onerror = () => rej(new Error(g));
    document.head.appendChild(s);
  });

  const go = label => `<button type="button" class="btn" data-go style="margin-top:12px">${label}</button>`;
  const out = '<p class="sub" data-out style="margin-top:12px"></p>';
  const hint = t => `<p class="sub">${t}</p>`;
  const lbl = (id, text) => `<label for="${id}">${text}</label>`;
  const inp = (id, text, type = 'text', val = '', extra = '') => `${lbl(id, text)}<input id="${id}" type="${type}" value="${esc(val)}"${extra}>`;
  const file = (id, text, accept) => `${lbl(id, text)}<input id="${id}" type="file" accept="${accept}">`;
  const sel = (id, text, opts) => `${lbl(id, text)}<select id="${id}">${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  const num = v => Number(v) || 0;
  const act = (b, fn) => {
    $(b, '[data-go]').onclick = async () => {
      const o = $(b, '[data-out]');
      try { await fn(o); } catch (e) { o.textContent = 'Something went wrong. Please check the file and try again.'; }
    };
  };
  const saveBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const loadImg = f => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f);
  });
  const toBlob = (c, t, q) => new Promise(r => c.toBlob(r, t, q));
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // Crops the image to fill a square (centre crop).
  const squareCanvas = (img, size) => {
    const c = canvas(size, size), ctx = c.getContext('2d');
    const s = Math.max(size / img.width, size / img.height), dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
    return c;
  };
  const pngBytes = async c => new Uint8Array(await (await toBlob(c, 'image/png')).arrayBuffer());

  // Builds a .ico file from PNG images. Modern browsers and Windows read PNG-based ICO files.
  const makeIco = entries => {
    const n = entries.length, headLen = 6 + 16 * n;
    const head = new DataView(new ArrayBuffer(headLen));
    head.setUint16(0, 0, true); head.setUint16(2, 1, true); head.setUint16(4, n, true);
    let offset = headLen;
    entries.forEach((e, i) => {
      const p = 6 + i * 16, dim = e.size >= 256 ? 0 : e.size;
      head.setUint8(p, dim); head.setUint8(p + 1, dim); head.setUint8(p + 2, 0); head.setUint8(p + 3, 0);
      head.setUint16(p + 4, 1, true); head.setUint16(p + 6, 32, true);
      head.setUint32(p + 8, e.bytes.length, true); head.setUint32(p + 12, offset, true);
      offset += e.bytes.length;
    });
    return new Blob([head.buffer, ...entries.map(e => e.bytes)], { type: 'image/x-icon' });
  };

  // MD5 (RFC 1321) for text. Browsers do not provide MD5, so it is implemented here.
  const md5 = str => {
    const bytes = new TextEncoder().encode(str), len = bytes.length;
    const total = ((len + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(total);
    buf.set(bytes); buf[len] = 0x80;
    const dv = new DataView(buf.buffer), bits = len * 8;
    dv.setUint32(total - 8, bits >>> 0, true);
    dv.setUint32(total - 4, Math.floor(bits / 4294967296), true);
    const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
    const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let off = 0; off < total; off += 64) {
      const M = [];
      for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) >>> 0;
        A = D; D = C; C = B;
        B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    const hex = n => Array.from({ length: 4 }, (_, i) => ((n >>> (8 * i)) & 255).toString(16).padStart(2, '0')).join('');
    return hex(a0) + hex(b0) + hex(c0) + hex(d0);
  };

  /*EVAL-START*/
  // Safe calculator: numbers, + - * / ^ %, !, brackets, pi, e, sin cos tan (degrees), log (base 10), ln, sqrt, abs.
  function evaluate(src) {
    const toks = [], tok = /\s*(?:(\d+\.?\d*|\.\d+)|([a-zA-Z]+)|(\*\*|[-+*/^%!(),]))/y;
    let pos = 0;
    while (pos < src.length) {
      tok.lastIndex = pos;
      const m = tok.exec(src);
      if (!m) { if (src.slice(pos).trim() === '') break; throw new Error('bad input'); }
      pos = tok.lastIndex;
      if (m[1]) toks.push({ t: 'num', v: m[1] });
      else if (m[2]) toks.push({ t: 'id', v: m[2] });
      else toks.push({ t: 'op', v: m[3] === '**' ? '^' : m[3] });
    }
    let i = 0;
    const isOp = v => toks[i] && toks[i].t === 'op' && toks[i].v === v;
    const eat = v => { if (isOp(v)) { i++; return true; } return false; };
    const need = v => { if (!eat(v)) throw new Error('expected ' + v); };
    const FN = {
      sin: x => Math.sin(x * Math.PI / 180), cos: x => Math.cos(x * Math.PI / 180), tan: x => Math.tan(x * Math.PI / 180),
      log: Math.log10, ln: Math.log, sqrt: Math.sqrt, abs: Math.abs
    };
    const CONST = { pi: Math.PI, e: Math.E };
    const fact = n => {
      if (n < 0 || n !== Math.floor(n) || n > 170) throw new Error('factorial');
      let r = 1; for (let k = 2; k <= n; k++) r *= k; return r;
    };
    function expr() {
      let v = term();
      for (;;) { if (eat('+')) v += term(); else if (eat('-')) v -= term(); else return v; }
    }
    function term() {
      let v = unary();
      for (;;) { if (eat('*')) v *= unary(); else if (eat('/')) v /= unary(); else return v; }
    }
    function unary() {
      if (eat('-')) return -unary();
      if (eat('+')) return unary();
      return power();
    }
    function power() {
      const b = postfix();
      if (eat('^')) return Math.pow(b, unary());
      return b;
    }
    function postfix() {
      let v = primary();
      for (;;) { if (eat('!')) v = fact(v); else if (eat('%')) v = v / 100; else return v; }
    }
    function primary() {
      const t = toks[i];
      if (!t) throw new Error('unexpected end');
      if (t.t === 'num') { i++; return Number(t.v); }
      if (t.t === 'id') {
        i++;
        const name = t.v.toLowerCase();
        if (name in CONST) return CONST[name];
        if (name in FN) { need('('); const a = expr(); need(')'); return FN[name](a); }
        throw new Error('unknown ' + name);
      }
      if (eat('(')) { const v = expr(); need(')'); return v; }
      throw new Error('unexpected');
    }
    const r = expr();
    if (i !== toks.length) throw new Error('extra input');
    if (!isFinite(r)) throw new Error('not a number');
    return r;
  }
  /*EVAL-END*/

  // Reads an ICO file and returns its PNG entries. Older BMP-based icons are skipped.
  const readIco = async bytes => {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = dv.getUint16(4, true), items = [];
    for (let i = 0; i < n; i++) {
      const p = 6 + i * 16;
      const w = dv.getUint8(p) || 256, size = dv.getUint32(p + 8, true), off = dv.getUint32(p + 12, true);
      const data = bytes.subarray(off, off + size);
      if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) items.push({ w, data });
    }
    return items;
  };

  Object.assign(TOOLS, {
    'Calculator — Basic & Scientific': {
      html: `<input id="ex" type="text" autocomplete="off" placeholder="Type or tap: 2+3*4, sqrt(16), sin(30)" style="width:100%;font-size:1.1rem">
<p class="sub" style="margin-top:6px">Trig functions use degrees. Use ^ for powers and ! for factorial.</p>
<div data-kp style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px"></div>
<p class="sub" data-out style="margin-top:12px;font-size:1.2rem"></p>`,
      init(b) {
        const ex = $(b, '#ex'), o = $(b, '[data-out]');
        const keys = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt(', '^', '!', '(', ')', '7', '8', '9', '/', '%', '4', '5', '6', '*', 'pi', '1', '2', '3', '-', 'e', '0', '.', '+', 'C', '⌫', '='];
        $(b, '[data-kp]').innerHTML = keys.map(k => `<button type="button" class="btn${k === '=' ? '' : ' o'}" data-k="${esc(k)}" style="margin-top:0;padding:10px 0;min-height:44px">${esc(k)}</button>`).join('');
        const run = () => {
          if (!ex.value.trim()) return;
          try { o.textContent = '= ' + String(+evaluate(ex.value).toPrecision(12)); }
          catch (e) { o.textContent = 'Check the expression.'; }
        };
        $(b, '[data-kp]').onclick = e => {
          const k = e.target.closest('[data-k]');
          if (!k) return;
          const v = k.dataset.k;
          if (v === 'C') { ex.value = ''; o.textContent = ''; }
          else if (v === '⌫') ex.value = ex.value.slice(0, -1);
          else if (v === '=') run();
          else ex.value += v;
          ex.focus();
        };
        ex.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); run(); } };
      }
    },

    'Password to MD5 / SHA-256': {
      html: `<label for="pw">Text or password</label><input id="pw" type="text" autocomplete="off" placeholder="Type here">
${hint('Hashing runs in your browser. Nothing is stored or sent anywhere. Hashes cannot be turned back into the original text.')}
<div data-out style="margin-top:12px;word-break:break-all;font-size:.9rem"></div>`,
      init(b) {
        const pw = $(b, '#pw'), o = $(b, '[data-out]');
        pw.oninput = async () => {
          const t = pw.value;
          if (!t) { o.innerHTML = ''; return; }
          const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
          const sha = Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('');
          o.innerHTML = `<p><strong>MD5</strong><br>${md5(t)}</p><p style="margin-top:10px"><strong>SHA-256</strong><br>${sha}</p>`;
        };
      }
    },

    'Favicon Preview Tool & Maker': {
      html: `${file('f', 'Logo or square image (PNG, JPG or WebP)', 'image/*')}
<div style="display:flex;gap:16px;align-items:end;margin-top:12px"><div><img data-p16 alt="" width="16" height="16" style="display:block"><small class="sub">16 px</small></div><div><img data-p32 alt="" width="32" height="32" style="display:block"><small class="sub">32 px</small></div></div>
${hint('Creates favicon-16x16.png, favicon-32x32.png, favicon-48x48.png, apple-touch-icon.png and favicon.ico in one ZIP file.')}${go('Create favicon ZIP')}${out}`,
      init(b) {
        let img = null;
        $(b, '#f').onchange = async () => {
          const f = $(b, '#f').files[0];
          if (!f) return;
          img = await loadImg(f);
          const u16 = squareCanvas(img, 16).toDataURL('image/png'), u32 = squareCanvas(img, 32).toDataURL('image/png');
          $(b, '[data-p16]').src = u16; $(b, '[data-p32]').src = u32;
        };
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose an image first.'; return; }
          await ensure('JSZip', JSZIP);
          const src = img || await loadImg(f);
          const zip = new window.JSZip();
          const sizes = [16, 32, 48];
          const icoEntries = [];
          for (const s of sizes) {
            const bytes = await pngBytes(squareCanvas(src, s));
            zip.file('favicon-' + s + 'x' + s + '.png', bytes);
            icoEntries.push({ size: s, bytes });
          }
          zip.file('apple-touch-icon.png', await pngBytes(squareCanvas(src, 180)));
          zip.file('favicon.ico', makeIco(icoEntries));
          saveBlob(await zip.generateAsync({ type: 'blob' }), 'favicon-pack.zip');
          o.textContent = 'Favicon pack downloaded.';
        });
      }
    },

    'ICO Converter (Favicon)': {
      html: `${file('f', 'Image (PNG, JPG or WebP)', 'image/*')}
${hint('Creates favicon.ico with 16, 32, 48 and 256 px sizes.')}${go('Create .ico file')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose an image first.'; return; }
          const img = await loadImg(f), entries = [];
          for (const s of [16, 32, 48, 256]) entries.push({ size: s, bytes: await pngBytes(squareCanvas(img, s)) });
          saveBlob(makeIco(entries), 'favicon.ico');
          o.textContent = 'favicon.ico downloaded.';
        });
      }
    },

    'ICO to PNG': {
      html: `${file('f', 'ICO file', '.ico,image/x-icon')}
${hint('Each size inside the icon is saved as a PNG, in one ZIP file. Very old BMP-style icons are not supported.')}${go('Extract PNG files')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose an ICO file first.'; return; }
          const items = await readIco(new Uint8Array(await f.arrayBuffer()));
          if (!items.length) { o.textContent = 'No PNG images were found in this ICO file.'; return; }
          await ensure('JSZip', JSZIP);
          const zip = new window.JSZip();
          items.forEach(it => zip.file('icon-' + it.w + 'x' + it.w + '.png', it.data));
          saveBlob(await zip.generateAsync({ type: 'blob' }), 'icon-pngs.zip');
          o.textContent = 'Extracted ' + items.length + ' PNG size(s).';
        });
      }
    },

    'WebP to JPG Converter': {
      html: `${file('f', 'WebP image', 'image/webp')}${go('Convert and download JPG')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a WebP image first.'; return; }
          const img = await loadImg(f), c = canvas(img.width, img.height), ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0);
          saveBlob(await toBlob(c, 'image/jpeg', 0.92), f.name.replace(/\.webp$/i, '') + '.jpg');
          o.textContent = 'JPG downloaded.';
        });
      }
    },

    'Thumbnail Resizer': {
      html: `${file('f', 'Image', 'image/*')}
${sel('pr', 'Size preset', [['1280x720', 'YouTube thumbnail (1280 × 720)'], ['1080x1080', 'Instagram square (1080 × 1080)'], ['1200x630', 'Facebook / link preview (1200 × 630)'], ['1200x675', 'X / Twitter card (1200 × 675)'], ['custom', 'Custom size']])}
${inp('cw', 'Custom width (px)', 'number', '1280', ' min="10"')}${inp('ch', 'Custom height (px)', 'number', '720', ' min="10"')}
${sel('md', 'Fit mode', [['crop', 'Crop to fill'], ['fit', 'Fit inside, white background'], ['stretch', 'Stretch']])}
${go('Resize and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose an image first.'; return; }
          const pr = $(b, '#pr').value;
          const [W, H] = pr === 'custom' ? [num($(b, '#cw').value), num($(b, '#ch').value)] : pr.split('x').map(Number);
          if (!W || !H) { o.textContent = 'Enter a valid width and height.'; return; }
          const img = await loadImg(f), c = canvas(W, H), ctx = c.getContext('2d');
          const mode = $(b, '#md').value;
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
          if (mode === 'stretch') ctx.drawImage(img, 0, 0, W, H);
          else if (mode === 'fit') {
            const s = Math.min(W / img.width, H / img.height), dw = img.width * s, dh = img.height * s;
            ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
          } else {
            const s = Math.max(W / img.width, H / img.height), dw = img.width * s, dh = img.height * s;
            ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
          }
          saveBlob(await toBlob(c, 'image/jpeg', 0.92), 'thumbnail-' + W + 'x' + H + '.jpg');
          o.textContent = 'Resized to ' + W + ' × ' + H + ' px.';
        });
      }
    },

    'Passport Photo Sheet': {
      html: `${file('f', 'Passport photo', 'image/*')}
${inp('cp', 'Number of photos on the sheet', 'number', '8', ' min="1" max="40"')}
${hint('Makes an A4 sheet at 300 dpi with 35 × 45 mm photos, cropped from the centre. Print at 100% (actual size), not "fit to page".')}
${go('Create A4 sheet')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a photo first.'; return; }
          const img = await loadImg(f);
          const { c, placed } = photoSheet(img, 35, 45, Math.max(1, num($(b, '#cp').value)), 3, false);
          saveBlob(await toBlob(c, 'image/jpeg', 0.95), 'passport-sheet-A4.jpg');
          o.textContent = placed + ' photo(s) placed on the A4 sheet.';
        });
      }
    },

    'A4 Photo Print Layout': {
      html: `${file('f', 'Photo', 'image/*')}
${inp('pw', 'Photo width (mm)', 'number', '35', ' min="5" max="200"')}${inp('ph', 'Photo height (mm)', 'number', '45', ' min="5" max="200"')}
${inp('cp', 'Number of copies', 'number', '12', ' min="1" max="200"')}${inp('gp', 'Spacing between photos (mm)', 'number', '3', ' min="0" max="20"')}
<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input id="cut" type="checkbox" checked style="width:auto;min-height:auto"> Show cut lines</label>
${go('Create A4 sheet')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a photo first.'; return; }
          const img = await loadImg(f);
          const w = num($(b, '#pw').value), h = num($(b, '#ph').value);
          if (!w || !h) { o.textContent = 'Enter the photo size in mm.'; return; }
          const { c, placed } = photoSheet(img, w, h, Math.max(1, num($(b, '#cp').value)), num($(b, '#gp').value), $(b, '#cut').checked);
          saveBlob(await toBlob(c, 'image/jpeg', 0.95), 'photo-sheet-A4.jpg');
          o.textContent = placed + ' photo(s) placed on the A4 sheet at 300 dpi.';
        });
      }
    },

    'Stamp Designer': {
      html: `<label for="sh">Shape</label><select id="sh"><option value="circle">Round</option><option value="rect">Rectangle</option></select>
${inp('l1', 'Top line', 'text', 'YOUR COMPANY')}${inp('l2', 'Middle line (large)', 'text', 'PAID')}${inp('l3', 'Bottom line', 'text', 'Jaipur')}
${inp('cl', 'Colour', 'color', '#2457d6', ' style="height:44px;padding:4px"')}
${hint('Straight text only for now. Curved text around the edge is coming in a later update.')}${go('Download transparent PNG')}${out}`,
      init(b) {
        act(b, async o => {
          const S = 800, c = canvas(S, S), ctx = c.getContext('2d');
          const col = $(b, '#cl').value, shape = $(b, '#sh').value;
          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 22; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (shape === 'circle') {
            ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 22, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 70, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.stroke();
          } else {
            ctx.strokeRect(22, 180, S - 44, S - 360);
          }
          const lines = [[$(b, '#l1').value, 54, 290], [$(b, '#l2').value, 120, 420], [$(b, '#l3').value, 54, 540]];
          lines.forEach(([t, px, y]) => {
            if (!t) return;
            ctx.font = `800 ${px}px system-ui, sans-serif`;
            ctx.fillText(t.toUpperCase(), S / 2, y, S - 120);
          });
          saveBlob(await toBlob(c, 'image/png'), 'stamp.png');
          o.textContent = 'Stamp downloaded.';
        });
      }
    }
  });

  // Places photos on an A4 sheet at 300 dpi. Sizes are in millimetres.
  function photoSheet(img, wmm, hmm, count, gapMm, cut) {
    const PX = 300 / 25.4, W = 2480, H = 3508, margin = 10 * PX;
    const pw = Math.round(wmm * PX), ph = Math.round(hmm * PX), gap = Math.round(gapMm * PX);
    const cols = Math.max(1, Math.floor((W - 2 * margin + gap) / (pw + gap)));
    const rows = Math.max(1, Math.floor((H - 2 * margin + gap) / (ph + gap)));
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const s = Math.max(pw / img.width, ph / img.height), dw = img.width * s, dh = img.height * s;
    let placed = 0;
    for (let r = 0; r < rows && placed < count; r++) {
      for (let k = 0; k < cols && placed < count; k++, placed++) {
        const x = margin + k * (pw + gap), y = margin + r * (ph + gap);
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, pw, ph); ctx.clip();
        ctx.drawImage(img, x + (pw - dw) / 2, y + (ph - dh) / 2, dw, dh);
        ctx.restore();
        if (cut) { ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.strokeRect(x, y, pw, ph); }
      }
    }
    return { c, placed };
  }
})();

/* DocSmartly free tools, batch 5. Loads after tools-4.js. Runs in the browser; nothing is uploaded
   except the optional IP lookup in "What Is My IP", which asks a public service (ipify) for your address. */
(function () {
  'use strict';
  const TOOLS = window.DSTools;
  if (!TOOLS) return;

  const $ = (r, s) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const QRLIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
  const ensure = (g, url) => window[g] ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.onload = res; s.onerror = () => rej(new Error(g));
    document.head.appendChild(s);
  });

  const go = label => `<button type="button" class="btn" data-go style="margin-top:12px">${label}</button>`;
  const out = '<p class="sub" data-out style="margin-top:12px"></p>';
  const hint = t => `<p class="sub">${t}</p>`;
  const lbl = (id, text) => `<label for="${id}">${text}</label>`;
  const inp = (id, text, type = 'text', val = '', extra = '') => `${lbl(id, text)}<input id="${id}" type="${type}" value="${esc(val)}"${extra}>`;
  const file = (id, text, accept) => `${lbl(id, text)}<input id="${id}" type="file" accept="${accept}">`;
  const area = (id, text, rows = 3) => `${lbl(id, text)}<textarea id="${id}" rows="${rows}" style="width:100%;font:inherit"></textarea>`;
  const act = (b, fn) => {
    $(b, '[data-go]').onclick = async () => {
      const o = $(b, '[data-out]');
      try { await fn(o); } catch (e) { o.textContent = 'Something went wrong. Please check the file and try again.'; }
    };
  };
  const saveBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const loadImg = f => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f);
  });
  const readDataURL = f => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f);
  });
  const toBlob = (c, t, q) => new Promise(r => c.toBlob(r, t, q));
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const num = v => Number(v) || 0;
  const hexToRgb = h => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
    const n = m ? parseInt(m[1], 16) : 0x2457d6;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  // Draws an image to fill a box (cover) or fit inside it (contain).
  const drawFit = (ctx, img, x, y, w, h, cover) => {
    const s = cover ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  };

  // ID cards are 85.6 × 54 mm, drawn at 300 dpi.
  const CARD_W = 1012, CARD_H = 638;
  const idCard = (fields) => ({
    html: `${file('ph', 'Photo (optional)', 'image/*')}
${fields.map(([id, label]) => inp(id, label)).join('\n')}
${inp('cl', 'Band colour', 'color', '#2457d6', ' style="height:44px;padding:4px"')}
${hint('Makes the front of the card at 85.6 × 54 mm, 300 dpi. Use "ID Card Front & Back to A4" to print front and back together.')}
${go('Create card PNG')}${out}`,
    init(b) {
      act(b, async o => {
        const cl = $(b, '#cl').value, [org, name] = [$(b, '#' + fields[0][0]).value.trim(), $(b, '#' + fields[1][0]).value.trim()];
        if (!name) { o.textContent = 'Enter the name.'; return; }
        const c = canvas(CARD_W, CARD_H), ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CARD_W, CARD_H);
        ctx.fillStyle = cl; ctx.fillRect(0, 0, CARD_W, 170);
        ctx.fillRect(0, CARD_H - 50, CARD_W, 50);
        ctx.fillStyle = '#fff'; ctx.font = '700 54px system-ui, sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillText(org || 'Organisation', 40, 85, CARD_W - 80);
        const pf = $(b, '#ph').files[0];
        ctx.fillStyle = '#eef3fb'; ctx.fillRect(40, 210, 250, 340);
        if (pf) { drawFit(ctx, await loadImg(pf), 40, 210, 250, 340, true); }
        ctx.strokeStyle = cl; ctx.lineWidth = 4; ctx.strokeRect(40, 210, 250, 340);
        ctx.fillStyle = '#13233f'; ctx.font = '800 66px system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(name, 330, 290, CARD_W - 370);
        ctx.font = '500 44px system-ui, sans-serif'; ctx.fillStyle = '#44506a';
        let y = 370;
        fields.slice(2).forEach(([id, label]) => {
          const v = $(b, '#' + id).value.trim();
          if (v) { ctx.fillText(label + ': ' + v, 330, y, CARD_W - 370); y += 66; }
        });
        saveBlob(await toBlob(c, 'image/png'), name.replace(/\s+/g, '-').toLowerCase() + '-id-card.png');
        o.textContent = 'ID card PNG downloaded.';
      });
    }
  });

  Object.assign(TOOLS, {
    'ID Card Maker': idCard([['org', 'Organisation name'], ['name', 'Full name'], ['no', 'ID number'], ['d1', 'Designation'], ['d2', 'Blood group / department']]),
    'Employee ID Card Maker': idCard([['org', 'Company name'], ['name', 'Employee name'], ['no', 'Employee ID'], ['d1', 'Designation'], ['d2', 'Department']]),
    'Student ID Card Maker': idCard([['org', 'School / college name'], ['name', 'Student name'], ['no', 'Roll number'], ['d1', 'Class'], ['d2', 'Session']]),

    'ID Card Front & Back to A4': {
      html: `${file('fr', 'Front side (photo or PNG)', 'image/*')}${file('bk', 'Back side (photo or PNG)', 'image/*')}
${hint('Places both sides on one A4 page at actual card size (85.6 × 54 mm) with cut lines. Print at 100%.')}
${go('Create A4 PDF')}${out}`,
      init(b) {
        act(b, async o => {
          const fr = $(b, '#fr').files[0], bk = $(b, '#bk').files[0];
          if (!fr || !bk) { o.textContent = 'Choose both the front and back images.'; return; }
          await ensure('jspdf', JSPDF);
          const c = canvas(2480, 3508), ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          const x = (c.width - CARD_W) / 2, ys = [420, 420 + CARD_H + 220];
          for (let i = 0; i < 2; i++) {
            const img = await loadImg(i === 0 ? fr : bk);
            ctx.save(); ctx.beginPath(); ctx.rect(x, ys[i], CARD_W, CARD_H); ctx.clip();
            drawFit(ctx, img, x, ys[i], CARD_W, CARD_H, false);
            ctx.restore();
            ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.strokeRect(x, ys[i], CARD_W, CARD_H);
          }
          const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
          pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
          pdf.save('id-card-a4.pdf');
          o.textContent = 'A4 PDF downloaded.';
        });
      }
    },

    'Visiting Card Designer': {
      html: `${inp('nm', 'Full name')}${inp('dg', 'Designation')}${inp('co', 'Company name')}
${inp('ph', 'Phone')}${inp('em', 'Email')}${inp('wb', 'Website')}${area('ad', 'Address', 2)}
${inp('cl', 'Accent colour', 'color', '#2457d6', ' style="height:44px;padding:4px"')}${file('lg', 'Logo (optional)', 'image/*')}
${hint('Creates a two-sided PDF at 90 × 50 mm: front with name and company, back with contact details.')}
${go('Create visiting card PDF')}${out}`,
      init(b) {
        act(b, async o => {
          const v = id => $(b, '#' + id).value.trim();
          if (!v('nm')) { o.textContent = 'Enter your name.'; return; }
          await ensure('jspdf', JSPDF);
          const [r, g, bl] = hexToRgb($(b, '#cl').value);
          const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: [90, 50], orientation: 'landscape' });
          // Front
          pdf.setFillColor(r, g, bl); pdf.rect(0, 0, 22, 50, 'F');
          pdf.setTextColor(19, 35, 63); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14);
          pdf.text(v('nm'), 30, 20);
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(36, 87, 214);
          if (v('dg')) pdf.text(v('dg'), 30, 27);
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(19, 35, 63);
          if (v('co')) pdf.text(v('co'), 30, 36);
          // Back
          pdf.addPage([90, 50], 'landscape');
          pdf.setFillColor(r, g, bl); pdf.rect(0, 0, 90, 8, 'F');
          const lg = $(b, '#lg').files[0];
          if (lg) {
            const img = await loadImg(lg), c = canvas(img.width, img.height);
            c.getContext('2d').drawImage(img, 0, 0);
            pdf.addImage(c.toDataURL('image/png'), 'PNG', 66, 13, 18, 18);
          }
          pdf.setTextColor(19, 35, 63); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
          let y = 18;
          [v('ph') && '☎ ' + v('ph'), v('em'), v('wb')].filter(Boolean).forEach(line => { pdf.text(line.replace('☎ ', 'Tel: '), 8, y); y += 6; });
          pdf.splitTextToSize(v('ad'), 58).slice(0, 3).forEach(line => { pdf.text(line, 8, y); y += 5; });
          pdf.save(v('nm').replace(/\s+/g, '-').toLowerCase() + '-visiting-card.pdf');
          o.textContent = 'Visiting card PDF downloaded.';
        });
      }
    },

    'QR Code Designer & Modifier': {
      html: `${inp('t', 'Text or link', 'text', 'https://example.com')}
${inp('fg', 'QR colour', 'color', '#13233f', ' style="height:44px;padding:4px"')}${inp('bg', 'Background colour', 'color', '#ffffff', ' style="height:44px;padding:4px"')}
${file('lg', 'Logo in the centre (optional)', 'image/*')}
${hint('Use a dark QR colour on a light background so phones can read it. A centre logo uses extra error correction and is covered up to about 22%.')}
${go('Create QR PNG')}${out}`,
      init(b) {
        act(b, async o => {
          const t = $(b, '#t').value.trim();
          if (!t) { o.textContent = 'Enter the text or link.'; return; }
          await ensure('qrcode', QRLIB);
          const logoFile = $(b, '#lg').files[0];
          const qr = window.qrcode(0, logoFile ? 'H' : 'M');
          qr.addData(t); qr.make();
          const n = qr.getModuleCount(), quiet = 4, cell = Math.floor(1000 / (n + quiet * 2)), size = cell * (n + quiet * 2);
          const c = canvas(size, size), ctx = c.getContext('2d');
          ctx.fillStyle = $(b, '#bg').value; ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = $(b, '#fg').value;
          for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
            if (qr.isDark(r, col)) ctx.fillRect((col + quiet) * cell, (r + quiet) * cell, cell, cell);
          }
          if (logoFile) {
            const box = Math.round(size * 0.22), x = (size - box) / 2;
            ctx.fillStyle = $(b, '#bg').value; ctx.fillRect(x - 8, x - 8, box + 16, box + 16);
            drawFit(ctx, await loadImg(logoFile), x, x, box, box, false);
          }
          saveBlob(await toBlob(c, 'image/png'), 'qr-code.png');
          o.textContent = 'QR code PNG downloaded (' + size + ' × ' + size + ' px).';
        });
      }
    },

    'PDF Compressor (KB)': {
      html: `${file('f', 'PDF file', 'application/pdf')}${inp('kb', 'Target size (KB)', 'number', '500', ' min="20"')}
${hint('Pages are re-saved as images at lower quality, so text can no longer be selected or searched. Works best on scanned or image-heavy PDFs.')}
${go('Compress and download')}${out}`,
      init(b) {
        act(b, async o => {
          const f = $(b, '#f').files[0];
          if (!f) { o.textContent = 'Choose a PDF first.'; return; }
          await ensure('jspdf', JSPDF);
          await ensure('pdfjsLib', PDFJS);
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
          const target = num($(b, '#kb').value) * 1024;
          const tries = [[1.5, 0.8], [1.2, 0.6], [1.0, 0.45], [0.8, 0.3], [0.6, 0.2]];
          let result = null, note = '';
          for (let k = 0; k < tries.length; k++) {
            const [scale, q] = tries[k];
            o.textContent = 'Trying setting ' + (k + 1) + ' of ' + tries.length + '…';
            let doc = null;
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i), base = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale });
              const c = canvas(Math.round(vp.width), Math.round(vp.height)), ctx = c.getContext('2d');
              ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
              await page.render({ canvasContext: ctx, viewport: vp }).promise;
              const orient = base.width > base.height ? 'l' : 'p';
              if (!doc) doc = new window.jspdf.jsPDF({ unit: 'pt', format: [base.width, base.height], orientation: orient });
              else doc.addPage([base.width, base.height], orient);
              doc.addImage(c.toDataURL('image/jpeg', q), 'JPEG', 0, 0, base.width, base.height);
            }
            result = doc.output('blob');
            note = 'Setting ' + (k + 1) + ' (scale ' + scale + ', quality ' + Math.round(q * 100) + '%).';
            if (result.size <= target) break;
          }
          const before = Math.round(f.size / 1024), after = Math.round(result.size / 1024);
          const name = f.name.replace(/\.pdf$/i, '') + '-compressed.pdf';
          saveBlob(result, name);
          o.textContent = before + ' KB → ' + after + ' KB. ' + (result.size <= target ? 'Under the target. ' : 'Could not reach the target; this is the smallest result. ') + note +
            (result.size >= f.size ? ' This file did not get smaller.' : '');
        });
      }
    },

    'Typing Speed Test — Hindi & English': {
      html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
<div><label for="lg">Language</label><select id="lg"><option value="en">English</option><option value="hi">हिन्दी (Hindi)</option></select></div>
<div><label for="mn">Duration</label><select id="mn"><option value="1">1 minute</option><option value="2">2 minutes</option><option value="5">5 minutes</option></select></div></div>
<p class="sub" data-prompt style="margin-top:12px;font-size:1rem;line-height:1.7;color:#13233f"></p>
<textarea id="ta" rows="4" disabled placeholder="Press Start, then type the text above" style="width:100%;font:inherit"></textarea>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><strong data-tm style="font-size:1.4rem">1:00</strong><button type="button" class="btn" data-go style="margin-top:0">Start</button></div>
<p class="sub" data-out style="margin-top:12px"></p>`,
      init(b) {
        const EN = ['The quick brown fox jumps over the lazy dog. Practice every day to improve your speed and accuracy.',
          'Technology has changed the way we live, work and learn. Stay focused, sit straight and type with care.',
          'A good typist keeps the eyes on the screen and uses all ten fingers. Slow and steady wins the race.'];
        const HI = ['भारत एक विशाल देश है। यहाँ अनेक भाषाएँ और संस्कृतियाँ हैं।',
          'हर दिन थोड़ा अभ्यास करने से टाइपिंग की गति और सटीकता दोनों बढ़ती हैं।'];
        const ta = $(b, '#ta'), tm = $(b, '[data-tm]'), o = $(b, '[data-out]'), pr = $(b, '[data-prompt]'), btn = $(b, '[data-go]');
        let prompt = '', timer = null, left = 0, mins = 1;
        const showPrompt = () => { pr.textContent = prompt = (($(b, '#lg').value === 'hi') ? HI : EN)[Math.floor(Math.random() * ((($(b, '#lg').value === 'hi') ? HI : EN)).length)]; };
        const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        const finish = () => {
          clearInterval(timer); timer = null;
          ta.disabled = true; btn.textContent = 'Start again';
          const typed = ta.value, n = Math.min(typed.length, prompt.length);
          let correct = 0;
          for (let i = 0; i < n; i++) if (typed[i] === prompt[i]) correct++;
          const wpm = Math.round((typed.length / 5) / mins), acc = typed.length ? Math.round(correct / typed.length * 100) : 0;
          o.innerHTML = `Speed: <strong>${wpm} WPM</strong> (words per minute)<br>Accuracy: <strong>${acc}%</strong><br>Characters typed: <strong>${typed.length}</strong>, correct: <strong>${correct}</strong>`;
        };
        $(b, '#lg').onchange = () => { if (!timer) showPrompt(); };
        btn.onclick = () => {
          if (timer) return;
          mins = num($(b, '#mn').value) || 1;
          showPrompt();
          ta.disabled = false; ta.value = ''; ta.focus(); o.textContent = '';
          left = mins * 60; tm.textContent = fmt(left);
          btn.textContent = 'Running…';
          timer = setInterval(() => {
            left--; tm.textContent = fmt(Math.max(0, left));
            if (left <= 0) finish();
          }, 1000);
        };
        showPrompt();
      }
    },

    'Marriage Biodata Maker': {
      html: `${file('ph', 'Photo (optional)', 'image/*')}
${inp('nm', 'Full name')}${inp('dob', 'Date of birth')}${inp('bt', 'Time of birth')}${inp('bp', 'Place of birth')}
${inp('ht', 'Height')}${inp('cx', 'Complexion')}${inp('ed', 'Education')}${inp('oc', 'Occupation')}
${inp('fa', 'Father\'s name')}${inp('mo', 'Mother\'s name')}${area('ad', 'Address', 2)}${inp('ct', 'Contact number')}${inp('hb', 'Hobbies')}
${hint('Creates a one-page A4 PDF. Fields left empty are left out. Hindi text needs a Devanagari font, which this tool does not include yet.')}
${go('Create biodata PDF')}${out}`,
      init(b) {
        act(b, async o => {
          const v = id => $(b, '#' + id).value.trim();
          if (!v('nm')) { o.textContent = 'Enter the name.'; return; }
          await ensure('jspdf', JSPDF);
          const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(19, 35, 63);
          pdf.text('BIODATA', 105, 24, { align: 'center' });
          pdf.setDrawColor(36, 87, 214); pdf.setLineWidth(0.8); pdf.line(70, 30, 140, 30);
          const pf = $(b, '#ph').files[0];
          if (pf) pdf.addImage(await readDataURL(pf), /png/i.test(pf.type) ? 'PNG' : 'JPEG', 150, 38, 40, 50);
          const rows = [['Name', v('nm')], ['Date of birth', v('dob')], ['Time of birth', v('bt')], ['Place of birth', v('bp')],
            ['Height', v('ht')], ['Complexion', v('cx')], ['Education', v('ed')], ['Occupation', v('oc')],
            ['Father\'s name', v('fa')], ['Mother\'s name', v('mo')], ['Address', v('ad')], ['Contact', v('ct')], ['Hobbies', v('hb')]].filter(r => r[1]);
          let y = pf ? 100 : 44;
          pdf.setFontSize(11);
          rows.forEach(([label, value]) => {
            const lines = pdf.splitTextToSize(value, 115);
            pdf.setFont('helvetica', 'bold'); pdf.setTextColor(36, 87, 214); pdf.text(label, 25, y);
            pdf.setFont('helvetica', 'normal'); pdf.setTextColor(19, 35, 63);
            pdf.text(':', 72, y); pdf.text(lines, 76, y);
            y += 8 + (lines.length - 1) * 5.5;
          });
          pdf.save(v('nm').replace(/\s+/g, '-').toLowerCase() + '-biodata.pdf');
          o.textContent = 'Biodata PDF downloaded.';
        });
      }
    },

    'What Is My IP': {
      html: `<div data-out style="font-size:.95rem;line-height:1.8">Looking up your address…</div>
${hint('Your public address is looked up with ipify.org, a public service. Nothing is stored by DocSmartly.')}`,
      init(b) {
        const o = $(b, '[data-out]');
        const get = url => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(j => j.ip);
        Promise.allSettled([get('https://api.ipify.org?format=json'), get('https://api64.ipify.org?format=json')]).then(([v4]) => {
          const ip = v4.status === 'fulfilled' ? v4.value : 'Not available';
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '-';
          o.innerHTML = `Public IP address: <strong>${esc(ip)}</strong><br>Browser: <strong>${esc(navigator.userAgent)}</strong><br>Platform: <strong>${esc(navigator.platform || '-')}</strong><br>Language: <strong>${esc(navigator.language || '-')}</strong><br>Screen: <strong>${screen.width} × ${screen.height}</strong><br>Time zone: <strong>${esc(tz)}</strong>`;
        });
      }
    }
  });
})();

/* DocSmartly free tools, batch 6. Loads after tools-5.js. Runs in the browser; nothing is uploaded. */
(function () {
  'use strict';
  const TOOLS = window.DSTools;
  if (!TOOLS) return;

  const $ = (r, s) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const ensure = (g, url) => window[g] ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.onload = res; s.onerror = () => rej(new Error(g));
    document.head.appendChild(s);
  });

  const go = (label, attr = 'data-go') => `<button type="button" class="btn" ${attr} style="margin-top:12px">${label}</button>`;
  const out = (attr = 'data-out') => `<p class="sub" ${attr} style="margin-top:12px"></p>`;
  const hint = t => `<p class="sub">${t}</p>`;
  const lbl = (id, text) => `<label for="${id}">${text}</label>`;
  const inp = (id, text, type = 'text', val = '', extra = '') => `${lbl(id, text)}<input id="${id}" type="${type}" value="${esc(val)}"${extra}>`;
  const file = (id, text, accept, multi) => `${lbl(id, text)}<input id="${id}" type="file" accept="${accept}"${multi ? ' multiple' : ''}>`;
  const area = (id, text, rows = 3) => `${lbl(id, text)}<textarea id="${id}" rows="${rows}" style="width:100%;font:inherit"></textarea>`;
  const act = (b, fn) => {
    $(b, '[data-go]').onclick = async () => {
      const o = $(b, '[data-out]');
      try { await fn(o); } catch (e) { o.textContent = 'Something went wrong. Please check the file and try again.'; }
    };
  };
  const saveBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const loadImg = f => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f);
  });
  const num = v => Number(v) || 0;

  /* ---------- Hindi typing: Roman letters to Devanagari (phonetic, approximate) ---------- */
  const DICT = {
    namaste: 'नमस्ते', dhanyavad: 'धन्यवाद', bharat: 'भारत', hindi: 'हिंदी', hindustan: 'हिंदुस्तान',
    ji: 'जी', kaise: 'कैसे', kaisi: 'कैसी', aap: 'आप', main: 'मैं', hum: 'हम', tum: 'तुम', tu: 'तू',
    ek: 'एक', do: 'दो', teen: 'तीन', char: 'चार', paanch: 'पाँच', kya: 'क्या', hai: 'है', hain: 'हैं',
    haan: 'हाँ', nahi: 'नहीं', accha: 'अच्छा', achha: 'अच्छा', theek: 'ठीक', kripya: 'कृपया', swagat: 'स्वागत',
    mera: 'मेरा', meri: 'मेरी', tera: 'तेरा', ghar: 'घर', paani: 'पानी', pani: 'पानी', dil: 'दिल', pyaar: 'प्यार',
    bhai: 'भाई', didi: 'दीदी', mummy: 'मम्मी', papa: 'पापा', sab: 'सब', log: 'लोग', bahut: 'बहुत', kuch: 'कुछ',
    sach: 'सच', shukriya: 'शुक्रिया', alvida: 'अलविदा', subah: 'सुबह', shubh: 'शुभ', ramram: 'रामराम',
    kal: 'कल', aaj: 'आज', abhi: 'अभी', yahan: 'यहाँ', wahan: 'वहाँ', kahan: 'कहाँ', kyun: 'क्यों', kab: 'कब',
    naam: 'नाम', school: 'स्कूल', kitab: 'किताब'
  };
  const CONS = { chh: 'छ', ch: 'च', kh: 'ख', gh: 'घ', jh: 'झ', th: 'थ', dh: 'ध', ph: 'फ', bh: 'भ', sh: 'श',
    k: 'क', g: 'ग', j: 'ज', t: 'त', d: 'द', n: 'न', p: 'प', b: 'ब', m: 'म', y: 'य', r: 'र', l: 'ल',
    v: 'व', w: 'व', s: 'स', h: 'ह', f: 'फ़', z: 'ज़', q: 'क़', x: 'क्स' };
  const MATRA = { aa: 'ा', ii: 'ी', ee: 'ी', uu: 'ू', oo: 'ू', ai: 'ै', au: 'ौ', ri: 'ृ', a: '', i: 'ि', u: 'ु', e: 'े', o: 'ो' };
  const INDEP = { aa: 'आ', ii: 'ई', ee: 'ई', uu: 'ऊ', oo: 'ऊ', ai: 'ऐ', au: 'औ', a: 'अ', i: 'इ', u: 'उ', e: 'ए', o: 'ओ' };
  const byLen = o => Object.keys(o).sort((a, b) => b.length - a.length);
  const CONS_K = byLen(CONS), MAT_K = byLen(MATRA), IND_K = byLen(INDEP);
  const matchAt = (w, i, keys) => keys.find(k => w.startsWith(k, i)) || null;
  const isLetter = ch => /[a-z]/.test(ch);

  function translitWord(w) {
    if (DICT[w] !== undefined) return DICT[w];
    let out = '', i = 0, afterVowel = true;
    while (i < w.length) {
      const c = matchAt(w, i, CONS_K);
      if (c) {
        out += CONS[c]; i += c.length; afterVowel = false;
        const v = matchAt(w, i, MAT_K);
        if (v) { out += MATRA[v]; i += v.length; afterVowel = true; }
        else if (i < w.length && isLetter(w[i]) && !matchAt(w, i, IND_K)) out += '्';
        continue;
      }
      const iv = matchAt(w, i, IND_K);
      if (iv) { out += INDEP[iv]; i += iv.length; afterVowel = true; continue; }
      out += w[i]; i++; afterVowel = false;
    }
    return out;
  }
  const toHindi = text => text.replace(/[A-Za-z]+/g, m => translitWord(m.toLowerCase()));

  /* ---------- OMR ---------- */
  const LETTERS = 'ABCDE';
  const cleanAnswers = s => s.toUpperCase().replace(/[^A-E]/g, '');

  /* ---------- Document scanner ---------- */
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  Object.assign(TOOLS, {
    'Hindi Typing Tool': {
      html: `<label for="en">Type in English letters</label>
<textarea id="en" rows="4" style="width:100%;font:inherit" placeholder="namaste dhanyavad"></textarea>
<label for="hi">Hindi output</label>
<textarea id="hi" rows="4" style="width:100%;font:inherit" readonly></textarea>
${hint('Converts sounds into Hindi. Common words are exact; other words are approximate, so check the result. Example: namaste → नमस्ते.')}
<button type="button" class="btn" data-copy style="margin-top:12px">Copy</button>
<button type="button" class="btn o" data-txt style="margin-top:12px">Download TXT</button>
<p class="sub" data-out style="margin-top:10px"></p>`,
      init(b) {
        const en = $(b, '#en'), hi = $(b, '#hi'), o = $(b, '[data-out]');
        en.oninput = () => { hi.value = toHindi(en.value); };
        $(b, '[data-copy]').onclick = async () => {
          if (!hi.value) { o.textContent = 'Type something first.'; return; }
          try { await navigator.clipboard.writeText(hi.value); o.textContent = 'Copied.'; }
          catch (e) { hi.select(); o.textContent = 'Press Ctrl+C to copy the selected text.'; }
        };
        $(b, '[data-txt]').onclick = () => {
          if (!hi.value) { o.textContent = 'Type something first.'; return; }
          // The byte-order mark lets Notepad show Hindi correctly.
          saveBlob(new Blob(['\uFEFF' + hi.value], { type: 'text/plain;charset=utf-8' }), 'hindi.txt');
          o.textContent = 'TXT downloaded.';
        };
      }
    },

    'OMR Sheet Generator & Checker': {
      html: `<h3 style="margin:4px 0 6px;font-size:1rem">1. Make a printable sheet</h3>
${inp('nq', 'Number of questions (5 to 100)', 'number', '50', ' min="5" max="100"')}
<label for="no">Options per question</label><select id="no"><option value="4">A to D</option><option value="5">A to E</option></select>
${inp('sn', 'Exam name (optional)')}
${go('Create OMR sheet PDF', 'data-gen')}
<h3 style="margin:18px 0 6px;font-size:1rem">2. Check answers</h3>
${hint('Type the answer key and the student\'s answers, one letter per question. Reading bubbles from a photo is not included yet.')}
${area('key', 'Answer key, for example ABCDA BCDAB', 3)}
${area('ans', 'Student answers in the same format', 3)}
${inp('mk', 'Marks for each correct answer', 'number', '1', ' min="0" step="0.25"')}
${inp('nm', 'Marks deducted for each wrong answer', 'number', '0', ' min="0" step="0.25"')}
${go('Check answers', 'data-chk')}
<p class="sub" data-res style="margin-top:12px"></p>`,
      init(b) {
        $(b, '[data-gen]').onclick = async () => {
          const res = $(b, '[data-res]');
          const n = Math.min(100, Math.max(5, Math.floor(num($(b, '#nq').value))));
          const k = Number($(b, '#no').value) || 4, opts = LETTERS.slice(0, k);
          try {
            await ensure('jspdf', JSPDF);
            const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(19, 35, 63);
            pdf.text('OMR ANSWER SHEET', 105, 18, { align: 'center' });
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
            if ($(b, '#sn').value.trim()) pdf.text($(b, '#sn').value.trim(), 105, 25, { align: 'center' });
            pdf.text('Name: ______________________________', 20, 40);
            pdf.text('Roll no: ____________________', 130, 40);
            pdf.text('Fill the circle completely with a black or blue pen. One answer per question.', 20, 52);
            const perCol = Math.ceil(n / 4), top = 70, step = 7;
            for (let q = 1; q <= n; q++) {
              const col = Math.floor((q - 1) / perCol), row = (q - 1) % perCol;
              const x0 = 20 + col * 45, y = top + row * step;
              pdf.setFontSize(9); pdf.text(q + '.', x0, y + 1);
              opts.forEach((L, j) => {
                const cx = x0 + 9 + j * 7;
                pdf.circle(cx, y, 2.2, 'S');
                pdf.setFontSize(6); pdf.text(L, cx, y - 3.2, { align: 'center' });
              });
            }
            pdf.save('omr-sheet-' + n + '-questions.pdf');
            res.textContent = 'OMR sheet with ' + n + ' questions downloaded.';
          } catch (e) { res.textContent = 'Could not create the sheet. Check your connection and try again.'; }
        };

        $(b, '[data-chk]').onclick = () => {
          const res = $(b, '[data-res]');
          const key = cleanAnswers($(b, '#key').value), ans = cleanAnswers($(b, '#ans').value);
          if (!key) { res.textContent = 'Enter the answer key.'; return; }
          const mk = num($(b, '#mk').value), neg = num($(b, '#nm').value);
          let right = 0, wrong = 0, skipped = 0; const wrongQs = [];
          for (let q = 0; q < key.length; q++) {
            const a = ans[q];
            if (!a) skipped++;
            else if (a === key[q]) right++;
            else { wrong++; wrongQs.push(q + 1); }
          }
          const score = right * mk - wrong * neg;
          res.innerHTML = `Score: <strong>${score}</strong> out of <strong>${key.length * mk}</strong><br>Correct: <strong>${right}</strong>, wrong: <strong>${wrong}</strong>, not answered: <strong>${skipped}</strong>` +
            (wrongQs.length ? `<br>Wrong answers: ${wrongQs.slice(0, 60).join(', ')}${wrongQs.length > 60 ? ' …' : ''}` : '');
        };
      }
    },

    'Document Scanner & PDF': {
      html: `${file('f', 'Photos of pages (select several; one page each)', 'image/*', true)}
${inp('cr', 'Trim edges by (% of each side)', 'number', '2', ' min="0" max="20" step="0.5"')}
<label for="md">Look</label><select id="md"><option value="bw">Black & white (best for text)</option><option value="gray">Grey</option><option value="colour">Colour</option></select>
${hint('Cleans up each page and puts it in an A4 PDF. Automatic edge detection and straightening are not included yet, so trim with the setting above if needed.')}
${go('Create scanned PDF')}${out()}`,
      init(b) {
        act(b, async o => {
          const files = [...$(b, '#f').files];
          if (!files.length) { o.textContent = 'Choose at least one page photo.'; return; }
          await ensure('jspdf', JSPDF);
          const trim = Math.min(20, Math.max(0, num($(b, '#cr').value))) / 100, mode = $(b, '#md').value;
          const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
          for (let i = 0; i < files.length; i++) {
            o.textContent = 'Processing page ' + (i + 1) + ' of ' + files.length + '…';
            const img = await loadImg(files[i]);
            const sx = img.width * trim, sy = img.height * trim, sw = img.width - sx * 2, sh = img.height - sy * 2;
            const c = canvas(Math.round(sw), Math.round(sh)), ctx = c.getContext('2d');
            if (mode === 'bw') ctx.filter = 'grayscale(100%) contrast(180%) brightness(115%)';
            else if (mode === 'gray') ctx.filter = 'grayscale(100%) contrast(120%)';
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
            const maxW = 194, maxH = 281, s = Math.min(maxW / c.width, maxH / c.height);
            const w = c.width * s, h = c.height * s;
            if (i) pdf.addPage();
            pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', (210 - w) / 2, (297 - h) / 2, w, h);
          }
          pdf.save('scan-' + new Date().toISOString().slice(0, 10) + '.pdf');
          o.textContent = 'Scanned PDF downloaded with ' + files.length + ' page(s).';
        });
      }
    }
  });
})();

/* DocSmartly online exam tool. Loads after tools-6.js.
   Needs the exam server (exam-server/) deployed on Cloudflare; set EXAM_API below to its address. */
(function () {
  'use strict';
  const TOOLS = window.DSTools;
  if (!TOOLS) return;

  // Replace with your Worker address after deploying, for example https://docsmartly-exams.yourname.workers.dev
  const EXAM_API = 'https://docsmartly-exams.YOUR-SUBDOMAIN.workers.dev';
  const NAME = 'Online Exam System — Teacher & Student';
  const KEYS = 'ds_exam_keys';

  const $ = (r, s) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const configured = () => !EXAM_API.includes('YOUR-SUBDOMAIN');

  const savedKeys = () => { try { return JSON.parse(localStorage.getItem(KEYS) || '{}'); } catch (e) { return {}; } };
  const rememberKey = (id, key) => { try { const m = savedKeys(); m[id] = key; localStorage.setItem(KEYS, JSON.stringify(m)); } catch (e) { /* storage may be blocked */ } };

  async function api(path, opts = {}) {
    if (!configured()) throw new Error('The exam server is not set up yet. Ask the site owner to add its address.');
    let r;
    try {
      r = await fetch(EXAM_API + path, {
        method: opts.method || 'GET',
        headers: { 'content-type': 'application/json', ...(opts.key ? { 'x-teacher-key': opts.key } : {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch (e) { throw new Error('Could not reach the exam server. Check your internet connection.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.');
    return j;
  }

  // Each line: Question | Option | Option | ... | correct letter (A to E)
  function parseQuestions(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Add at least one question.');
    return lines.map((line, i) => {
      const p = line.split('|').map(s => s.trim());
      const letter = (p.pop() || '').toUpperCase();
      const q = p.shift(), options = p;
      const idx = letter.length === 1 ? letter.charCodeAt(0) - 65 : -1;
      if (!q || options.length < 2 || options.length > 5 || idx < 0 || idx >= options.length) {
        throw new Error('Line ' + (i + 1) + ': use Question | Option | Option | ... | correct letter, with 2 to 5 options.');
      }
      return { q, options, answer: idx };
    });
  }

  const examIdFrom = s => {
    const m = /#exam=([a-z0-9]{8})/.exec(s) || /^([a-z0-9]{8})$/.exec(s.trim());
    return m ? m[1] : '';
  };

  function menu(b) {
    $(b, '#exb').innerHTML = `
      <p class="sub">Choose what you want to do. No registration needed.</p>
      <div style="display:grid;gap:8px;margin-top:10px">
        <button type="button" class="btn" data-v="create">Create an exam (teacher)</button>
        <button type="button" class="btn o" data-v="take">Take an exam (student)</button>
        <button type="button" class="btn o" data-v="results">See results (teacher)</button>
      </div>`;
  }

  function createView(b) {
    $(b, '#exb').innerHTML = `
      <label for="xt">Exam title</label><input id="xt" type="text" placeholder="Class 8 Science test">
      <label for="xq">Questions, one per line</label>
      <textarea id="xq" rows="8" style="width:100%;font:inherit" placeholder="What is 2 + 2? | 3 | 4 | 5 | B"></textarea>
      <p class="sub">Format: Question | Option | Option | Option | Option | correct letter (A to E)</p>
      <button type="button" class="btn" id="xgo" style="margin-top:12px">Create exam</button>
      <div id="xres" style="margin-top:12px"></div>
      <button type="button" class="btn o" data-v="menu" style="margin-top:12px">Back</button>`;
    $(b, '#xgo').onclick = async () => {
      const res = $(b, '#xres');
      try {
        const title = $(b, '#xt').value.trim();
        const questions = parseQuestions($(b, '#xq').value);
        if (!title) throw new Error('Enter an exam title.');
        res.textContent = 'Creating…';
        const j = await api('/api/exams', { method: 'POST', body: { title, questions } });
        rememberKey(j.id, j.teacherKey);
        const link = location.origin + location.pathname + '#exam=' + j.id;
        res.innerHTML = `<p><strong>Exam created.</strong></p>
          <p class="sub">Share this link with students:</p><p style="word-break:break-all"><a href="${esc(link)}">${esc(link)}</a></p>
          <p class="sub">Your teacher key (shown only once; it is saved in this browser):</p><p style="word-break:break-all"><strong>${esc(j.teacherKey)}</strong></p>`;
      } catch (e) { res.textContent = e.message; }
    };
  }

  function takeView(b, id) {
    $(b, '#exb').innerHTML = `
      <label for="xid">Exam code or link</label><input id="xid" type="text" value="${esc(id || '')}" placeholder="Paste the exam link or code">
      <button type="button" class="btn" id="xload" style="margin-top:12px">Open exam</button>
      <div id="xres" style="margin-top:12px"></div>
      <button type="button" class="btn o" data-v="menu" style="margin-top:12px">Back</button>`;
    $(b, '#xload').onclick = async () => {
      const res = $(b, '#xres');
      const examId = examIdFrom($(b, '#xid').value);
      if (!examId) { res.textContent = 'Enter a valid exam code or link.'; return; }
      try {
        res.textContent = 'Loading…';
        const ex = await api('/api/exams/' + examId);
        renderExam(b, ex);
      } catch (e) { res.textContent = e.message; }
    };
    if (id) $(b, '#xload').click();
  }

  function renderExam(b, ex) {
    const qs = ex.questions.map((q, i) => `
      <fieldset style="border:1px solid var(--ln);border-radius:10px;padding:10px;margin-top:10px">
        <legend style="font-weight:700;padding:0 6px">${i + 1}. ${esc(q.q)}</legend>
        ${q.options.map((o, j) => `<label style="font-weight:400;display:flex;gap:8px;align-items:center;margin:6px 0"><input type="radio" name="q${i}" value="${j}" style="width:auto;min-height:auto"> ${String.fromCharCode(65 + j)}. ${esc(o)}</label>`).join('')}
      </fieldset>`).join('');
    $(b, '#exb').innerHTML = `
      <h3 style="margin:0 0 6px">${esc(ex.title)}</h3>
      <label for="xn">Your name</label><input id="xn" type="text" placeholder="Full name">
      ${qs}
      <button type="button" class="btn" id="xsub" style="margin-top:12px">Submit answers</button>
      <div id="xres" style="margin-top:12px"></div>`;
    $(b, '#xsub').onclick = async () => {
      const res = $(b, '#xres');
      const name = $(b, '#xn').value.trim();
      if (!name) { res.textContent = 'Enter your name first.'; return; }
      const answers = ex.questions.map((_, i) => {
        const checked = b.querySelector(`input[name="q${i}"]:checked`);
        return checked ? Number(checked.value) : -1;
      });
      try {
        res.textContent = 'Submitting…';
        const j = await api('/api/exams/' + ex.id + '/submit', { method: 'POST', body: { name, answers } });
        res.innerHTML = `<p><strong>Thank you, ${esc(name)}.</strong></p><p>Your score: <strong>${j.score} out of ${j.total}</strong></p>`;
        $(b, '#xsub').disabled = true;
      } catch (e) { res.textContent = e.message; }
    };
  }

  function resultsView(b) {
    const keys = savedKeys(), ids = Object.keys(keys);
    $(b, '#exb').innerHTML = `
      <label for="rid">Exam code</label><input id="rid" type="text" value="${esc(ids[ids.length - 1] || '')}" placeholder="From the exam link, e.g. #exam=abcd1234">
      <label for="rkey">Teacher key</label><input id="rkey" type="text" value="${esc(keys[ids[ids.length - 1]] || '')}" placeholder="Shown when you created the exam">
      <button type="button" class="btn" id="rgo" style="margin-top:12px">Show results</button>
      <div id="rres" style="margin-top:12px"></div>
      <button type="button" class="btn o" data-v="menu" style="margin-top:12px">Back</button>`;
    $(b, '#rgo').onclick = async () => {
      const res = $(b, '#rres');
      const id = examIdFrom($(b, '#rid').value), key = $(b, '#rkey').value.trim();
      if (!id || !key) { res.textContent = 'Enter the exam code and teacher key.'; return; }
      try {
        res.textContent = 'Loading…';
        const j = await api('/api/exams/' + id + '/results', { key });
        const rows = j.results.map(r => `<tr><td>${esc(r.name)}</td><td>${r.score}</td><td>${r.total}</td><td>${new Date(r.submitted_at).toLocaleString('en-IN')}</td></tr>`).join('');
        res.innerHTML = `<p><strong>${esc(j.title)}</strong>: ${j.results.length} submission(s)</p>
          <div class="tw"><table><thead><tr><th>Name</th><th>Score</th><th>Total</th><th>Submitted</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No submissions yet.</td></tr>'}</tbody></table></div>
          ${j.results.length ? '<button type="button" class="btn o" id="rcsv" style="margin-top:12px">Download CSV</button>' : ''}`;
        const csv = $(b, '#rcsv');
        if (csv) csv.onclick = () => {
          const lines = [['Name', 'Score', 'Total', 'Submitted']].concat(j.results.map(r => [r.name, r.score, r.total, new Date(r.submitted_at).toISOString()]));
          const text = lines.map(row => row.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' }));
          a.download = 'results-' + id + '.csv';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        };
      } catch (e) { res.textContent = e.message; }
    };
  }

  TOOLS[NAME] = {
    html: `<div id="exb"></div>`,
    init(b) {
      const go = v => {
        if (v === 'create') createView(b);
        else if (v === 'take') takeView(b, '');
        else if (v === 'results') resultsView(b);
        else menu(b);
      };
      // Bound to the content box, which is rebuilt each time the tool opens.
      $(b, '#exb').addEventListener('click', e => {
        const btn = e.target.closest('[data-v]');
        if (btn) go(btn.dataset.v);
      });
      // A student opening a shared link lands straight on the exam.
      if (window.DSExamPreset) {
        const id = window.DSExamPreset;
        window.DSExamPreset = '';
        takeView(b, id);
      } else menu(b);
    }
  };

  // Shared link: https://your-site/#exam=abcd1234 opens the exam tool directly.
  const m = /#exam=([a-z0-9]{8})/.exec(location.hash);
  if (m) {
    window.DSExamPreset = m[1];
    setTimeout(() => {
      const t = document.createElement('div');
      t.setAttribute('data-tool', NAME);
      document.body.appendChild(t);
      t.click();
      t.remove();
    }, 300);
  }
})();
