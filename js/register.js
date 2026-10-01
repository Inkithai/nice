/* ============================================================
   NICE (demo clone) — register page logic
   ============================================================ */
(function () {
  'use strict';
  const { Store, UI } = window;
  const { icon, toast } = UI;

  /* inject field icons */
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

  const $phone = document.getElementById('phone');
  const $invite = document.getElementById('invite');
  const $pw = document.getElementById('password');
  const $pw2 = document.getElementById('password2');
  const $code = document.getElementById('vcode');
  const $agree = document.getElementById('agree');
  const $err = document.getElementById('reg-error');
  const $eye = document.getElementById('toggle-pw');
  const $getCode = document.getElementById('get-code');

  /* password visibility toggle */
  $eye.innerHTML = icon('eye');
  $eye.addEventListener('click', () => {
    const show = $pw.type === 'password';
    $pw.type = show ? 'text' : 'password';
    $eye.innerHTML = icon(show ? 'eyeoff' : 'eye');
  });

  /* agreement documents (same docs as login) */
  document.querySelectorAll('[data-doc]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const TERMS = {
        title: 'User Agreement',
        body: '<h4>1. About this demo</h4><p>This is a static, front-end demo built for learning purposes. It is not the real NICE service and is not affiliated with nicemktlk.com.</p><h4>2. Accounts</h4><p>Demo accounts are stored only in your own browser (localStorage).</p><h4>3. Your content</h4><p>Content you publish stays on your device. Nothing is uploaded to any server.</p><h4>4. No warranty</h4><p>The demo is provided “as is”.</p>'
      };
      const PRIVACY = {
        title: 'Privacy Policy',
        body: '<h4>1. What we store</h4><p>All demo data is saved in your browser’s localStorage only.</p><h4>2. What we send</h4><p>Nothing. There is no backend, no analytics and no tracking.</p><h4>3. Removing your data</h4><p>Use “Reset demo data” in Settings or clear your browser storage.</p>'
      };
      const d = a.dataset.doc === 'privacy' ? PRIVACY : TERMS;
      UI.openModal('<div class="doc"><h3>' + UI.esc(d.title) + '</h3>' + d.body + '<button class="btn-primary" data-close="1">I understand</button></div>');
    });
  });

  function fail(msg) {
    $err.textContent = msg;
    $err.hidden = false;
    toast(msg, 'error');
  }

  /* ---- get verification code (demo: any 6-digit code is accepted) ---- */
  let countdown = null;
  $getCode.addEventListener('click', () => {
    if (countdown) return;
    if (!Store.validPhone($phone.value)) {
      return fail('Enter a valid phone number first (e.g. 071 234 5678)');
    }
    const phone = Store.normalizePhone($phone.value);
    if (Store.db.accounts.some(a => a.phone === phone)) {
      return fail('This phone number is already registered — try logging in instead.');
    }
    $err.hidden = true;
    toast('Demo mode: verification code sent. Use any 6 digits (e.g. ' + Store.DEMO_VERIFY_CODE + ')');
    let left = 60;
    $getCode.disabled = true;
    $getCode.classList.add('busy');
    $getCode.textContent = 'Resend in ' + left + 's';
    countdown = setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(countdown);
        countdown = null;
        $getCode.disabled = false;
        $getCode.classList.remove('busy');
        $getCode.textContent = 'Get code';
      } else {
        $getCode.textContent = 'Resend in ' + left + 's';
      }
    }, 1000);
  });

  /* ---- submit ---- */
  document.getElementById('reg-form').addEventListener('submit', (e) => {
    e.preventDefault();
    $err.hidden = true;

    if (!Store.validPhone($phone.value)) {
      return fail('Please enter a valid Sri Lankan phone number (e.g. 071 234 5678)');
    }
    const phone = Store.normalizePhone($phone.value);
    if (Store.db.accounts.some(a => a.phone === phone)) {
      return fail('This phone number is already registered — try logging in.');
    }
    if ($pw.value.length < 6) {
      return fail('Password must be at least 6 characters');
    }
    if ($pw.value !== $pw2.value) {
      return fail('Passwords do not match');
    }
    if (!/^[0-9]{6}$/.test($code.value.trim())) {
      return fail('Enter the 6-digit verification code (demo: any 6 digits, e.g. 123456)');
    }
    if (!$agree.checked) {
      return fail('Please agree to the User Agreement and Privacy Policy');
    }

    /* create the account + profile */
    const db = Store.db;
    const id = 'u' + Date.now().toString(36);
    const invite = $invite.value.trim();

    db.users.push({
      id,
      name: 'NICE User ' + phone.slice(-4),
      handle: 'user' + phone.slice(-4),
      bio: invite ? ('Invited by @' + invite.replace(/^@/, '') + ' 🎉') : 'New here — hello NICE! 👋',
      verified: false,
      vip: false,
      followers: 1,
      following: 0,
      isMe: false
    });
    db.accounts.push({ phone, password: $pw.value, userId: id });
    Store.saveDB();

    Store.setSession(id);
    toast('Account created — welcome to NICE! 🎉');
    setTimeout(() => location.replace('app.html'), 550);
  });
})();
