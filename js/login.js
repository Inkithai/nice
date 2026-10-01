/* ============================================================
   NICE (demo clone) — login page logic
   ============================================================ */
(function () {
  'use strict';
  const { Store, UI } = window;
  const { icon, toast, esc } = UI;

  /* auto-redirect if already signed in */
  if (Store.getSession()) {
    location.replace('app.html');
    return;
  }

  /* inject field icons */
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

  const $phone = document.getElementById('phone');
  const $pw = document.getElementById('password');
  const $remember = document.getElementById('remember');
  const $agree = document.getElementById('agree');
  const $err = document.getElementById('login-error');
  const $eye = document.getElementById('toggle-pw');

  /* restore remembered credentials */
  const rem = Store.getRemembered();
  if (rem && rem.phone) {
    $phone.value = rem.phone;
    $pw.value = rem.password || '';
    $remember.checked = true;
  }

  /* password visibility toggle */
  $eye.innerHTML = icon('eye');
  $eye.addEventListener('click', () => {
    const show = $pw.type === 'password';
    $pw.type = show ? 'text' : 'password';
    $eye.innerHTML = icon(show ? 'eyeoff' : 'eye');
    $pw.focus();
  });

  /* fill demo credentials */
  document.getElementById('fill-demo').addEventListener('click', () => {
    $phone.value = '0712345678';
    $pw.value = Store.DEMO_PASSWORD;
    $agree.checked = true;
    $remember.checked = true;
    toast('Demo credentials filled — press “Log in now”');
    $pw.focus();
  });

  function fail(msg) {
    $err.textContent = msg;
    $err.hidden = false;
    toast(msg, 'error');
  }

  /* submit */
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    $err.hidden = true;

    if (!Store.validPhone($phone.value)) {
      return fail('Please enter a valid Sri Lankan phone number (e.g. 071 234 5678)');
    }
    if (!$pw.value) {
      return fail('Please enter your password');
    }
    if (!$agree.checked) {
      return fail('Please agree to the User Agreement and Privacy Policy');
    }

    const phone = Store.normalizePhone($phone.value);
    const account = Store.db.accounts.find(a => a.phone === phone);

    if (!account || account.password !== $pw.value) {
      return fail('Incorrect phone number or password. Try the demo credentials below.');
    }

    /* success */
    if ($remember.checked) {
      Store.setRemembered({ phone: $phone.value.trim(), password: $pw.value });
    } else {
      Store.setRemembered(null);
    }
    Store.setSession(account.userId);
    toast('Welcome back! Logging you in…');
    setTimeout(() => location.replace('app.html'), 550);
  });

  /* agreement documents */
  document.querySelectorAll('[data-doc]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openDoc(a.dataset.doc);
    });
  });

  function openDoc(which) {
    const TERMS = {
      title: 'User Agreement',
      body: (
        '<h4>1. About this demo</h4><p>This is a static, front-end demo built for learning purposes. It is not the real NICE service and is not affiliated with nicemktlk.com.</p>' +
        '<h4>2. Accounts</h4><p>You are responsible for keeping your demo credentials confidential. Accounts created here are stored only in your own browser (localStorage).</p>' +
        '<h4>3. Your content</h4><p>Content you publish in this demo stays on your device. Nothing is uploaded to any server.</p>' +
        '<h4>4. Acceptable use</h4><p>Do not use the demo to pretend to be someone else or to mislead others.</p>' +
        '<h4>5. No warranty</h4><p>The demo is provided “as is”, with no guarantee of availability or fitness for any purpose.</p>'
      )
    };
    const PRIVACY = {
      title: 'Privacy Policy',
      body: (
        '<h4>1. What we store</h4><p>All demo data — your profile, posts, likes and chats — is saved in your browser’s localStorage only.</p>' +
        '<h4>2. What we send</h4><p>Nothing. There is no backend, no analytics and no tracking of any kind in this demo.</p>' +
        '<h4>3. Removing your data</h4><p>Use “Reset demo data” in Settings, or clear your browser storage, to erase everything instantly.</p>' +
        '<h4>4. Third parties</h4><p>No third party receives any data from this demo.</p>'
      )
    };
    const d = which === 'privacy' ? PRIVACY : TERMS;
    UI.openModal(
      '<div class="doc"><h3>' + esc(d.title) + '</h3>' + d.body +
      '<button class="btn-primary" data-close="1">I understand</button></div>'
    );
  }
})();
