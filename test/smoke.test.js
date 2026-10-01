/* Headless smoke test of the NICE demo clone using jsdom.
   Simulates: login → home feed → like → comment → discover →
   publish → messages/chat → profile → logout → register. */
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
  const html = read(file);
  const dom = new JSDOM(html, {
    url: 'http://localhost:8080/' + file,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){} }));
  if (seedSession) window.localStorage.setItem('nice_demo_v1:session', JSON.stringify(seedSession));
  for (const f of ['js/store.js', 'js/ui.js']) {
    window.eval(read(f));
  }
  return dom;
}

/* ============ 1. LOGIN PAGE ============ */
console.log('\n— Login page —');
{
  const dom = bootPage('index.html');
  const { window } = dom;
  const doc = window.document;
  window.eval(read('js/login.js'));

  check('demo credentials card present', !!doc.getElementById('demo-phone') && doc.getElementById('demo-phone').textContent.includes('071 234 5678'));

  // wrong password
  doc.getElementById('phone').value = '0712345678';
  doc.getElementById('password').value = 'wrongpass';
  doc.getElementById('login-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  check('wrong password rejected', !doc.getElementById('login-error').hidden);

  // fill demo + login
  doc.getElementById('fill-demo').click();
  check('fill-demo populates phone', doc.getElementById('phone').value === '0712345678');
  check('fill-demo populates password', doc.getElementById('password').value === 'demo1234');

  const replaces = [];
  doc.getElementById('login-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  check('error cleared on valid submit', doc.getElementById('login-error').hidden);
  check('session set to demo user', window.localStorage.getItem('nice_demo_v1:session') === JSON.stringify('u0'));
  check('login success path ran (welcome toast)', doc.getElementById('toast').textContent.includes('Welcome back'));
  check('credentials remembered', JSON.parse(window.localStorage.getItem('nice_demo_v1:remembered')).phone === '0712345678');
}

/* ============ 2. REGISTER PAGE ============ */
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
  check('mismatched invite/empty handled / registers', JSON.parse(window.localStorage.getItem('nice_demo_v1:db')).accounts.length === 2);
  const db = JSON.parse(window.localStorage.getItem('nice_demo_v1:db'));
  const acct = db.accounts.find(a => a.phone === '0771234567');
  check('new account stored', !!acct && acct.password === 'secret99');
  check('new user profile created', db.users.some(u => u.id === acct.userId));
  check('auto-login session set', window.localStorage.getItem('nice_demo_v1:session') === JSON.stringify(acct.userId));
}

/* ============ 3. APP ============ */
console.log('\n— App (logged in as demo user) —');
{
  const dom = bootPage('app.html', { seedSession: 'u0' });
  const { window } = dom;
  const doc = window.document;
  const $ = s => doc.querySelector(s);
  const $$ = s => Array.from(doc.querySelectorAll(s));

  window.location.hash = '#/home';
  window.eval(read('js/app.js'));
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

  // --- home ---
  check('topbar rendered', $('.topbar .brand') && $('.topbar .brand').textContent === 'NICE');
  check('stories row rendered (your story + friends with posts)', $$('.stories .story').length === 6);
  check('feed has 8 posts', $$('.post').length === 8);
  check('follow buttons on others posts', $$('[data-action="follow"]').length === 6);
  check('seed liked post shows liked state', $('.pa[data-action="like"][data-pid="p3"]').classList.contains('liked'));

  // --- like toggle ---
  const likeBtn = $('.pa[data-action="like"][data-pid="p1"]');
  const before = likeBtn.querySelector('span').textContent;
  click(likeBtn);
  check('like toggles on', $('.pa[data-action="like"][data-pid="p1"]').classList.contains('liked'));
  check('like count increments', $('.pa[data-action="like"][data-pid="p1"] span').textContent !== before);
  click(likeBtn);
  check('like toggles back off', !$('.pa[data-action="like"][data-pid="p1"]').classList.contains('liked'));

  // --- follow toggle ---
  const fbtn = $('[data-action="follow"][data-uid="u3"]');
  check('u3 initially unfollowed', fbtn.textContent === 'Follow');
  click(fbtn);
  check('follow works', $('[data-action="follow"][data-uid="u3"]').textContent === 'Following');

  // --- comment via modal ---
  click($('[data-action="comments"][data-pid="p1"]'));
  check('post detail modal opens', !!$('#modal') && !!$('#cm-list'));
  $('#cm-text').value = 'Test comment!';
  $('#cm-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const dbAfter = JSON.parse(window.localStorage.getItem('nice_demo_v1:db'));
  check('comment persisted', (dbAfter.extraComments.p1 || []).some(c => c.text === 'Test comment!'));
  check('comment count updated in feed', $('.pa[data-action="comments"][data-pid="p1"] span').textContent === '3');
  check('comment preview updated', $('.comment-preview[data-pid="p1"]').textContent.includes('Test comment!'));
  UIclose();
  function UIclose() { window.UI.closeModal(); }

  // --- notifications ---
  click($('[data-action="notifications"]'));
  check('notifications sheet lists 3 items', $$('#modal .notif').length === 3);
  window.UI.closeModal();

  // --- stories ---
  click($('[data-action="story"]'));
  check('story viewer opens', !!$('.story-viewer'));
  click($('[data-action="story-next"]'));
  check('story advances', !!$('.story-viewer'));
  click($('[data-action="story-close"]'));
  check('story viewer closes', !$('.story-viewer'));

  // --- discover ---
  window.location.hash = '#/discover';
  window.dispatchEvent(new window.Event('hashchange'));
  check('discover grid renders 8 photos', $$('#discover-results .gi').length === 8);
  const q = $('#discover-q');
  q.value = 'sunset';
  q.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('search filters by caption', $$('#discover-results .gi').length === 1);
  q.value = '#foodie';
  q.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('tag search filters', $$('#discover-results .gi').length === 1);
  check('suggested users rendered', $$('#suggested-users .user-row').length >= 1);

  // tag chip click navigates + filters
  click($('#chip-row .tag-chip'));
  check('tag chip sets filtered grid', $$('#discover-results .gi').length >= 1);

  // --- publish (preset gallery) ---
  window.location.hash = '#/publish';
  window.dispatchEvent(new window.Event('hashchange'));
  check('publish gallery has 9 tiles', $$('#pub-gallery .gi').length === 9);
  click($('[data-action="pick"][data-src="images/posts/beach.jpg"]'));
  check('photo preview appears', !!$('#pub-preview img'));
  $('#pub-caption').value = 'My new beach post';
  $('#pub-tags').value = 'sunset, beach';
  $('#pub-loc').value = 'Bentota';
  click($('[data-action="publish"]'));
  const db2 = JSON.parse(window.localStorage.getItem('nice_demo_v1:db'));
  const newPost = db2.posts.find(p => p.caption === 'My new beach post');
  check('post persisted with tags', !!newPost && newPost.tags.join(',') === 'sunset,beach' && newPost.location === 'Bentota');
  check('navigated home after publish', window.location.hash === '#/home');
  window.dispatchEvent(new window.Event('hashchange'));
  check('feed now shows 9 posts (new at top)', $$('.post').length === 9 && $('.post .caption').textContent.includes('My new beach post'));

  // --- messages + chat ---
  window.location.hash = '#/messages';
  window.dispatchEvent(new window.Event('hashchange'));
  check('chat list renders 3 chats', $$('.chat-row').length === 3);
  check('unread badges show 3 total', $$('.chat-row .bdg').length === 2);
  const firstChat = $('.chat-row');
  const cid = firstChat.dataset.cid;
  click(firstChat);
  check('chat screen opens', !!$('.chat-screen'));
  check('unread cleared on open', JSON.parse(window.localStorage.getItem('nice_demo_v1:db')).chats.find(c => c.id === cid).unread === 0);
  $('#chat-text').value = 'Hello from the test!';
  $('#chat-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const db3 = JSON.parse(window.localStorage.getItem('nice_demo_v1:db'));
  check('message sent + persisted', db3.chats.find(c => c.id === cid).messages.some(m => m.text === 'Hello from the test!'));
  await0();
  function await0() {}
  click($('[data-action="chat-back"]'));
  check('chat closes on back', !$('.chat-screen'));

  // --- profile ---
  window.location.hash = '#/profile';
  window.dispatchEvent(new window.Event('hashchange'));
  check('profile shows demo name', $('.p-name').textContent.includes('Demo User'));
  check('VIP badge shown (demo starts as VIP)', !!$('.p-name .badge-vip'));
  check('profile stats show 3 posts (2 seed + 1 published)', $('.p-stats .st b').textContent === '3');
  check('my posts grid has 3 photos', $$('.photo-grid .gi').length === 3);
  check('settings items present', $$('.settings-item').length === 6);

  // edit profile
  click($('[data-action="edit-profile"]'));
  $('#pf-name').value = 'Renamed User';
  $('#pf-bio').value = 'New bio here';
  $('#profile-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  check('profile edit saved', $('.p-name').textContent.includes('Renamed User') && $('.p-bio').textContent === 'New bio here');

  // VIP modal + recharge
  click($('[data-action="vip"]'));
  check('VIP modal with 3 plans', $$('#modal .plan').length === 3);
  const walletBefore = $('#wallet-amt').textContent;
  click($('[data-vip="recharge"]'));
  check('recharge increases wallet', $('#wallet-amt').textContent !== walletBefore);
  window.UI.closeModal();

  // logout
  click($('[data-action="logout"]'));
  check('logout confirm appears', !!$('#confirm-ok'));
  click($('#confirm-ok'));
  check('session cleared on logout', window.localStorage.getItem('nice_demo_v1:session') === null);

  // --- unauthenticated redirect ---
  const dom2 = new JSDOM(read('app.html'), {
    url: 'http://localhost:8080/app.html', runScripts: 'outside-only', pretendToBeVisual: true
  });
  dom2.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom2.window.eval(read('js/store.js'));
  dom2.window.eval(read('js/ui.js'));
  dom2.window.eval(read('js/app.js'));
  check('app renders nothing when signed out (redirects to login)', !dom2.window.document.querySelector('#view .topbar'));
}

console.log('\n==============================');
console.log('PASSED: ' + passed + '   FAILED: ' + failed);
process.exit(failed ? 1 : 0);
