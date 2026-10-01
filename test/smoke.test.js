/* Headless smoke test of the NICE demo clone (music task platform)
   using jsdom. Simulates: login → dashboard → task player (fast-forward)
   → wallet/withdraw/deposit → team → profile → VIP upgrade → logout →
   register (welcome bonus). */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('  ✔ ' + name); }
  else { failed++; console.log('  ✘ FAIL: ' + name); }
}

function bootPage(file, { seedSession } = {}) {
  const dom = new JSDOM(read(file), {
    url: 'http://localhost:8080/' + file,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  if (seedSession) window.localStorage.setItem('nice_demo_v2:session', JSON.stringify(seedSession));
  window.eval(read('js/store.js'));
  window.eval(read('js/ui.js'));
  return dom;
}

/* ============ 1. LOGIN PAGE ============ */
console.log('\n— Login page —');
{
  const dom = bootPage('index.html');
  const { window } = dom;
  const doc = window.document;
  window.eval(read('js/login.js'));

  check('demo credentials card present', doc.getElementById('demo-phone').textContent.includes('071 234 5678'));

  doc.getElementById('phone').value = '0712345678';
  doc.getElementById('password').value = 'wrongpass';
  doc.getElementById('login-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  check('wrong password rejected', !doc.getElementById('login-error').hidden);

  doc.getElementById('fill-demo').click();
  check('fill-demo populates fields',
    doc.getElementById('phone').value === '0712345678' && doc.getElementById('password').value === 'demo1234');

  doc.getElementById('login-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  check('error cleared on valid submit', doc.getElementById('login-error').hidden);
  check('session set to demo user', window.localStorage.getItem('nice_demo_v2:session') === JSON.stringify('u0'));
  check('welcome toast shown', doc.getElementById('toast').textContent.includes('Welcome back'));
  check('credentials remembered', JSON.parse(window.localStorage.getItem('nice_demo_v2:remembered')).phone === '0712345678');
}

/* ============ 2. APP — dashboard & tasks ============ */
console.log('\n— App: dashboard & music tasks —');
{
  const dom = bootPage('app.html', { seedSession: 'u0' });
  const { window } = dom;
  const doc = window.document;
  const $ = s => doc.querySelector(s);
  const $$ = s => Array.from(doc.querySelectorAll(s));
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const dbNow = () => JSON.parse(window.localStorage.getItem('nice_demo_v2:db'));

  window.location.hash = '#/home';
  window.eval(read('js/synth.js'));
  window.eval(read('js/app.js'));

  /* --- home dashboard --- */
  check('topbar rendered', $('.topbar .brand') && $('.topbar .brand').textContent === 'NICE');
  check('notice marquee rendered', $('.marquee span') && $('.marquee span').textContent.includes('NICE Music'));
  check('balance card shows LKR 1,500', $('.dc-row b').textContent.replace(/,/g, '').includes('1500'));
  check('vip tag shows VIP 1', $('.vip-tag').textContent.includes('VIP 1'));
  check('tasks today shows 1/6', $('.dc-stats .ds:nth-child(2) b').textContent === '1/6');
  check('quick actions rendered (4)', $$('.q-btn').length === 4);
  check('hot tracks rendered (5)', $$('.hot-card').length === 5);
  check('recent activity rendered', $$('.record-list .record').length === 4);

  /* --- music task list --- */
  window.location.hash = '#/music';
  window.dispatchEvent(new window.Event('hashchange'));
  check('task list renders 8 tracks', $$('.task-row').length === 8);
  check('completed track shows done state', $('.task-row.done') && $('.task-row.done .tr-state').textContent === 'Done today');
  check('locked tracks show lock chips (VIP 2 track only)', $$('.lock-chip').length === 1);
  check('reward reflects VIP 1 multiplier (35 → 42)', $('.task-row[data-tid="t1"] .reward-chip').textContent.includes('42'));

  /* --- locked track redirects to VIP modal --- */
  click($('.task-row[data-tid="t8"]'));
  check('locked task opens VIP upgrade modal', !!$('#modal .plan'));
  window.UI.closeModal();

  /* --- task player: complete via fast-forward --- */
  const walletBefore = dbNow().perUser.u0.wallet;
  click($('.task-row[data-tid="t1"]'));
  check('player overlay opens', !!$('.player'));
  check('countdown shows 00:30', $('#pl-time').textContent === '00:30');
  check('reward chip shows +42', $('.pl-reward').textContent.includes('42'));
  click($('[data-action="ff"]'));
  check('success panel appears', !!$('.player.success'));
  check('task reward credited (+42)', $('.suc-amt').textContent.includes('42'));
  check('wallet increased in storage', dbNow().perUser.u0.wallet === walletBefore + 42);
  check('earnings record added', dbNow().earnings.some(e => e.type === 'task' && e.label.includes('Ocean Breeze')));
  check('tasks today now 2/6', $('.suc-stats .ds:nth-child(1) b').textContent === '2/6');
  check('next task button offered', !!$('[data-action="next-task"]'));

  /* --- replay of a done task gives no reward --- */
  click($('[data-action="close-player"]'));
  window.location.hash = '#/music';
  window.dispatchEvent(new window.Event('hashchange'));
  const w2 = dbNow().perUser.u0.wallet;
  click($('.task-row[data-tid="t1"]'));
  check('done task reopens as replay', $('.pl-note').textContent.includes('already completed'));
  click($('[data-action="ff"]'));
  check('replay gives no reward', dbNow().perUser.u0.wallet === w2 && $('.suc-amt').textContent.includes('No reward'));
  click($('[data-action="close-player"]'));

  /* --- start button opens next available task --- */
  click($('#nav-start'));
  check('start button opens a task player', !!$('.player') && !$('.player.success'));
  check('opened an undone, unlocked track', $('.pl-meta b').textContent.length > 0 && !$('.pl-note').textContent.includes('already'));
  click($('[data-action="close-player"]'));

  /* --- wallet view --- */
  window.location.hash = '#/wallet';
  window.dispatchEvent(new window.Event('hashchange'));
  check('wallet renders balance + stats', $('.dc-row b') && $$('.ws').length === 3);
  check('records include new task entry', $$('.record-list .record').length >= 6);

  /* withdraw validation: below minimum */
  click($('[data-action="withdraw"]'));
  $('#wd-amount').value = '100';
  $('#wd-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  check('withdraw below minimum rejected', $('#toast').textContent.includes('Minimum'));
  /* valid withdraw */
  const wBefore = dbNow().perUser.u0.wallet;
  $('#wd-amount').value = '600';
  $('#wd-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  check('valid withdraw deducts balance', dbNow().perUser.u0.wallet === wBefore - 600);
  check('withdraw record added', dbNow().earnings.some(e => e.type === 'withdraw' && e.amount === -600));

  /* deposit */
  click($('[data-action="deposit"]'));
  const wBefore2 = dbNow().perUser.u0.wallet;
  click($('[data-dep="5000"]'));
  check('deposit credits wallet', dbNow().perUser.u0.wallet === wBefore2 + 5000);

  /* --- team view --- */
  window.location.hash = '#/team';
  window.dispatchEvent(new window.Event('hashchange'));
  check('team renders 6 members', $$('.record-list .record').length === 6);
  check('invite code shown', $('#iv-link') && doc.body.textContent.includes('NICE-DEMO'));
  check('commission stats rendered', $$('.dash-card .ds').length === 2);

  /* --- profile --- */
  window.location.hash = '#/profile';
  window.dispatchEvent(new window.Event('hashchange'));
  check('profile shows demo name', $('.p-name').textContent.includes('Demo User'));
  check('VIP badge shown', !!$('.p-name .badge-vip'));
  check('settings items present (7)', $$('.settings-item').length === 7);

  click($('[data-action="edit-profile"]'));
  $('#pf-name').value = 'Task Master';
  $('#profile-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  check('profile edit saved', $('.p-name').textContent.includes('Task Master'));

  /* --- VIP upgrade flow --- */
  click($('[data-action="vip"]'));
  check('VIP modal lists 5 tiers', $$('#modal .plan').length === 5);
  const walletPre = dbNow().perUser.u0.wallet;
  click($('[data-plan="4"]'));                      /* VIP 4 costs 19,900 */
  click($('[data-vip="subscribe"]'));
  check('insufficient balance blocked', dbNow().perUser.u0.vip === 1);
  check('error toast about balance', $('#toast').textContent.includes('balance'));
  /* recharge enough (LKR 1,000 per click) then subscribe */
  let walletNow = dbNow().perUser.u0.wallet;
  const needed = Math.max(0, Math.ceil((19900 - walletNow) / 1000));
  for (let i = 0; i < needed; i++) click($('[data-vip="recharge"]'));
  walletNow = dbNow().perUser.u0.wallet;
  check('recharged above plan price', walletNow >= 19900);
  click($('[data-vip="subscribe"]'));
  const dbVip = dbNow();
  check('upgrade to VIP 4 succeeded', dbVip.perUser.u0.vip === 4 && dbVip.perUser.u0.wallet === walletNow - 19900);
  window.UI.closeModal();

  /* VIP 4: more daily tasks + higher multiplier */
  window.location.hash = '#/music';
  window.dispatchEvent(new window.Event('hashchange'));
  check('daily limit now 40 (VIP 4)', $('.dash-card .ds:nth-child(1) b').textContent === '2/40');
  check('locked tracks unlocked at VIP 4', $$('.lock-chip').length === 0);

  /* --- notifications --- */
  window.location.hash = '#/home';
  window.dispatchEvent(new window.Event('hashchange'));
  click($('[data-action="notifications"]'));
  check('notifications sheet opens with items', $$('#modal .notif').length >= 5);
  window.UI.closeModal();

  /* --- logout --- */
  window.location.hash = '#/profile';
  window.dispatchEvent(new window.Event('hashchange'));
  click($('[data-action="logout"]'));
  check('logout confirm appears', !!$('#confirm-ok'));
  click($('#confirm-ok'));
  check('session cleared on logout', window.localStorage.getItem('nice_demo_v2:session') === null);

  /* --- unauthenticated guard --- */
  const dom2 = new JSDOM(read('app.html'), {
    url: 'http://localhost:8080/app.html', runScripts: 'outside-only', pretendToBeVisual: true
  });
  dom2.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom2.window.eval(read('js/store.js'));
  dom2.window.eval(read('js/ui.js'));
  dom2.window.eval(read('js/synth.js'));
  dom2.window.eval(read('js/app.js'));
  check('app renders nothing when signed out (redirects to login)', !dom2.window.document.querySelector('#view .topbar'));
}

/* ============ 3. REGISTER ============ */
console.log('\n— Register page —');
{
  const dom = bootPage('register.html');
  const { window } = dom;
  const doc = window.document;
  window.eval(read('js/register.js'));

  doc.getElementById('phone').value = '0771234567';
  doc.getElementById('password').value = 'secret99';
  doc.getElementById('password2').value = 'secret99';
  doc.getElementById('vcode').value = '123456';
  doc.getElementById('reg-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

  const db = JSON.parse(window.localStorage.getItem('nice_demo_v2:db'));
  const acct = db.accounts.find(a => a.phone === '0771234567');
  check('new account stored', !!acct && acct.password === 'secret99');
  check('welcome bonus +1000 recorded', db.earnings.some(e => e.type === 'bonus' && e.amount === 1000 && e.ts > Date.now() - 60000));
  check('new user starts Free tier with LKR 1000', db.perUser[acct.userId] && db.perUser[acct.userId].vip === 0 && db.perUser[acct.userId].wallet === 1000);
  check('auto-login session set', window.localStorage.getItem('nice_demo_v2:session') === JSON.stringify(acct.userId));
}

console.log('\n==============================');
console.log('PASSED: ' + passed + '   FAILED: ' + failed);
process.exit(failed ? 1 : 0);
