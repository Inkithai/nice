/* ============================================================
   NICE (demo clone) — shared UI helpers: icons, toast, modal,
   avatars, time formatting
   ============================================================ */
(function () {
  'use strict';

  /* ---------- inline SVG icon set (simple stroke icons) ---------- */
  const P = {
    home: '<path d="M3 9.5 12 2.5l9 7V21a1.5 1.5 0 0 1-1.5 1.5H15V14H9v8.5H4.5A1.5 1.5 0 0 1 3 21Z"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.7-4.7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chat: '<path d="M21 11.5c0 4.1-4 7.5-9 7.5-1 0-2-.14-2.9-.4L4 21l1.5-4.2C4 15.4 3 13.6 3 11.5 3 7.4 7 4 12 4s9 3.4 9 7.5Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M20 21v-1.5A5.5 5.5 0 0 0 14.5 14h-5A5.5 5.5 0 0 0 4 19.5V21"/>',
    bell: '<path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8Z"/>',
    comment: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.9l7.6-4.3M8.2 13.1l7.6 4.3"/>',
    eye: '<path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M1.5 12S5.5 4.5 12 4.5c2 0 3.7.7 5.2 1.6M22.5 12S18.5 19.5 12 19.5c-2 0-3.7-.7-5.2-1.6"/><path d="M4 20 20 4"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    code: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
    gift: '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Zm0 0h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>',
    card: '<rect x="2" y="5" width="20" height="15" rx="2.5"/><path d="M2 10.5h20"/>',
    crown: '<path d="M3 17.5 4.5 7l4.7 4L12 4.5l2.8 6.5L19.5 7 21 17.5Z"/><path d="M4 21h16"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15.5 16 10.5 5 21"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    tag: '<path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    sparkle: '<path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5L10 13 3.5 11 10 9Z"/><path d="M19 3.5v4M17 5.5h4"/>',
    arrowright: '<path d="M5 12h14M12 5l7 7-7 7"/>'
  };

  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  /* filled heart for the "liked" state */
  function heartFilled(cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P.heart + '</svg>';
  }

  /* verified / VIP badges (small filled) */
  function badgeVerified(size) {
    size = size || 14;
    return '<svg class="badge-v" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-label="verified"><path fill="#3ba0ff" d="M12 1.7l2.2 1.7 2.8-.3 1 2.6 2.6 1-.3 2.8L21.7 12 20.3 14l.3 2.8-2.6 1-1 2.6-2.8-.3L12 21.8 9.8 20l-2.8.3-1-2.6-2.6-1 .3-2.8L2.3 12l1.4-2-.3-2.8 2.6-1 1-2.6 2.8.3Z"/><path d="M8.2 12.2l2.5 2.5 5-5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function badgeVIP(size) {
    size = size || 14;
    return '<svg class="badge-vip" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-label="VIP"><path fill="url(#vipg' + size + ')" d="M2.6 18.5 4.3 6.8l4.9 4.2L12 4.3l2.8 6.7 4.9-4.2 1.7 11.7Z"/><defs><linearGradient id="vipg' + size + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7b733"/><stop offset="1" stop-color="#fc4a1a"/></linearGradient></defs></svg>';
  }

  /* ---------- avatars (initial + gradient fallback) ---------- */
  const GRADS = [
    ['#7b2ff7', '#f107a3'], ['#00c6ff', '#0072ff'], ['#f7971e', '#ffd200'],
    ['#11998e', '#38ef7d'], ['#fc4a1a', '#f7b733'], ['#8e2de2', '#4a00e0'],
    ['#ee0979', '#ff6a00'], ['#02aab0', '#00cdac']
  ];

  function avatarHTML(user, size, opts) {
    opts = opts || {};
    size = size || 44;
    if (!user) return '';
    const dim = 'width:' + size + 'px;height:' + size + 'px;';
    if (user.avatarImg) {
      return '<img class="avatar' + (opts.cls ? ' ' + opts.cls : '') + '" style="' + dim + '" src="' + user.avatarImg + '" alt="' + esc(user.name) + '">';
    }
    let h = 0;
    for (let i = 0; i < user.handle.length; i++) h = (h * 31 + user.handle.charCodeAt(i)) % 997;
    const g = GRADS[h % GRADS.length];
    const initial = (user.name || '?').trim().charAt(0).toUpperCase();
    return '<span class="avatar avatar-txt' + (opts.cls ? ' ' + opts.cls : '') + '" style="' + dim + 'background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')">' + esc(initial) + '</span>';
  }

  /* ---------- misc helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function timeAgo(ts) {
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'now';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h';
    const d = Math.floor(h / 24);
    if (d < 7) return d + 'd';
    return Math.floor(d / 7) + 'w';
  }

  function fmtCount(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function fmtLKR(n) {
    return 'LKR ' + (Number(n) || 0).toLocaleString('en-US');
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg, type) {
    const host = document.getElementById('frame') || document.body;
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      host.appendChild(el);
    }
    el.className = 'toast show' + (type ? ' toast-' + type : '');
    el.innerHTML = (type === 'error' ? icon('close') : icon('check')) + '<span>' + esc(msg) + '</span>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, 2600);
  }

  /* ---------- modal (returns wrapper; caller fills content) ---------- */
  function openModal(html, opts) {
    opts = opts || {};
    closeModal();
    const host = document.getElementById('frame') || document.body;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.id = 'modal';
    wrap.innerHTML =
      '<div class="modal ' + (opts.cls || '') + '" role="dialog" aria-modal="true">' +
      (opts.closable === false ? '' :
        '<button class="modal-close" data-close="1" aria-label="Close">' + icon('close') + '</button>') +
      html +
      '</div>';
    host.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-close]')) closeModal();
    });
    return wrap;
  }  function closeModal() {
    const m = document.getElementById('modal');
    if (m) m.remove();
  }

  window.UI = {
    icon, heartFilled, badgeVerified, badgeVIP,
    avatarHTML, esc, timeAgo, fmtCount, fmtLKR,
    toast, openModal, closeModal, GRADS
  };
})();
