/* Thunder House ENT: branded popup in place of the browser's alert() box.
   Load it in <head> on any page; every alert() on that page then uses it.
   A short first line followed by a blank line becomes the popup's title. */
(function () {
  const queue = [];
  let showing = false;

  function kind(msg) {
    if (/fail|error|could not|couldn't|declined|denied|not found|invalid|problem/i.test(msg)) return 'error';
    if (/please|note:|required|warning|heads up/i.test(msg)) return 'warn';
    if (/success|saved|sent|signed|paid|approved|thank you|locked in|✅/i.test(msg)) return 'ok';
    return 'info';
  }
  const LOOK = {
    ok:    { icon: 'fa-circle-check',         color: '#22c55e', bg: 'rgba(34,197,94,.12)', title: 'All set!' },
    error: { icon: 'fa-circle-xmark',         color: '#ff3d55', bg: 'rgba(255,61,85,.12)', title: 'Something went wrong' },
    warn:  { icon: 'fa-triangle-exclamation', color: '#ffb703', bg: 'rgba(255,183,3,.12)', title: 'Heads up' },
    info:  { icon: 'fa-circle-info',          color: '#00e5ff', bg: 'rgba(0,229,255,.12)', title: 'Thunder House ENT' },
  };

  function build() {
    const css = document.createElement('style');
    css.textContent = `
      #th-alert { position: fixed; inset: 0; z-index: 5000; display: none; align-items: center; justify-content: center;
        padding: 16px; background: rgba(3,5,9,.78); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
      #th-alert.show { display: flex; }
      .th-alert-card { width: 100%; max-width: 420px; text-align: center; background: #0e121b; border-radius: 18px;
        border: 1px solid var(--th-alert-color); padding: 28px 24px 22px;
        box-shadow: 0 20px 60px rgba(0,0,0,.85), 0 0 30px var(--th-alert-bg);
        animation: thAlertIn .22s cubic-bezier(.16,1,.3,1); font-family: var(--font-body, 'Outfit', system-ui, sans-serif); }
      @keyframes thAlertIn { from { transform: translateY(10px) scale(.97); opacity: 0; } to { transform: none; opacity: 1; } }
      .th-alert-icon { width: 58px; height: 58px; margin: 0 auto 14px; border-radius: 50%; display: grid; place-items: center;
        font-size: 1.6rem; color: var(--th-alert-color); background: var(--th-alert-bg); }
      .th-alert-card h3 { margin: 0 0 8px; color: #fff; font-size: 1.25rem; font-family: var(--font-heading, 'Syne', sans-serif); }
      .th-alert-msg { margin: 0 0 20px; color: #cbd5e1; font-size: .95rem; line-height: 1.55; white-space: pre-line; word-break: break-word; }
      .th-alert-ok { min-width: 120px; padding: 10px 26px; border: none; border-radius: 999px; cursor: pointer; font-weight: 800;
        letter-spacing: .04em; text-transform: uppercase; color: #05070b; background: var(--th-alert-color); font-family: inherit; }
      .th-alert-ok:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }`;
    document.head.appendChild(css);

    const el = document.createElement('div');
    el.id = 'th-alert';
    el.innerHTML = `
      <div class="th-alert-card" role="alertdialog" aria-modal="true" aria-labelledby="th-alert-title">
        <div class="th-alert-icon"><i class="fa-solid"></i></div>
        <h3 id="th-alert-title"></h3>
        <p class="th-alert-msg"></p>
        <button type="button" class="th-alert-ok">OK</button>
      </div>`;
    document.body.appendChild(el);
    const close = () => { el.classList.remove('show'); showing = false; next(); };
    el.querySelector('.th-alert-ok').addEventListener('click', close);
    el.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); } });
    return el;
  }

  function next() {
    if (showing || !queue.length) return;
    const raw = queue.shift();
    const el = document.getElementById('th-alert') || build();
    const look = LOOK[kind(raw)];

    // "⚡ Payment Successful!\n\nThank you..." -> title + body
    let title = look.title, body = raw;
    const m = /^([^\n]{1,60})\n\s*\n([\s\S]+)$/.exec(raw);
    if (m) { title = m[1].replace(/^[^\p{L}\p{N}]+/u, '').trim() || title; body = m[2]; }

    const card = el.querySelector('.th-alert-card');
    card.style.setProperty('--th-alert-color', look.color);
    card.style.setProperty('--th-alert-bg', look.bg);
    el.querySelector('.th-alert-icon i').className = 'fa-solid ' + look.icon;
    el.querySelector('#th-alert-title').textContent = title;
    el.querySelector('.th-alert-msg').textContent = body;
    el.classList.add('show');
    showing = true;
    el.querySelector('.th-alert-ok').focus();
  }

  window.alert = function (msg) {
    queue.push(String(msg == null ? '' : msg));
    if (document.body) next(); else document.addEventListener('DOMContentLoaded', next, { once: true });
  };
})();
