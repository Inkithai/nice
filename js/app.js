/* ============================================================
   NICE (demo clone) — app logic
   Music listening task platform:
   Home dashboard · Task centre (music player) · Wallet · Team · Profile
   All state lives in localStorage via Store.
   ============================================================ */
(function () {
  'use strict';

  const { Store, UI } = window;
  const {
    icon, badgeVIP, avatarHTML, esc, timeAgo, fmtLKR, toast, openModal, closeModal
  } = UI;

  /* ---------- auth guard (mirrors the original's "Please log in first") ---------- */
  const session = Store.getSession();
  if (!session) {
    location.replace('index.html');
    return;
  }

  const db = Store.db;
  const $view = document.getElementById('view');
  const $overlay = document.getElementById('overlay-root');

  /* ============================================================
     state helpers
     ============================================================ */

  function todayKey() { return new Date().toISOString().slice(0, 10); }

  function prefs() {
    if (!db.perUser) db.perUser = {};
    if (!db.perUser[session]) {
      db.perUser[session] = {
        vip: 0, wallet: 0, profile: {}, notifsOn: true,
        tasksDone: {}, day: todayKey()
      };
    }
    const p = db.perUser[session];
    if (p.day !== todayKey()) {          /* daily reset */
      p.day = todayKey();
      p.tasksDone = {};
      Store.saveDB();
    }
    return p;
  }

  function vipLevel() { return prefs().vip || 0; }
  function vipInfo(l) { return Store.VIP[l == null ? vipLevel() : l]; }
  function rewardFor(t) { return Math.round(t.reward * vipInfo().rewardMult); }
  function locked(t) { return (t.vipMin || 0) > vipLevel(); }
  function trackById(id) { return db.tracks.find(t => t.id === id); }

  function tasksDoneToday() { return Object.keys(prefs().tasksDone).length; }
  function remainingTasks() { return Math.max(0, vipInfo().daily - tasksDoneToday()); }

  function sameDay(ts) { return new Date(ts).toDateString() === new Date().toDateString(); }
  function todayEarned() {
    return db.earnings
      .filter(e => sameDay(e.ts) && e.amount > 0 && (e.type === 'task' || e.type === 'commission'))
      .reduce((s, e) => s + e.amount, 0);
  }
  function totalEarned() {
    return db.earnings.filter(e => e.amount > 0 && e.type !== 'deposit').reduce((s, e) => s + e.amount, 0);
  }
  function totalWithdrawn() {
    return -db.earnings.filter(e => e.type === 'withdraw').reduce((s, e) => s + e.amount, 0);
  }

  function meUser() { return db.users.find(u => u.id === session) || { name: 'NICE User', handle: 'niceuser' }; }
  function myName() { return prefs().profile.name || meUser().name; }
  function myPhone() {
    const a = db.accounts.find(a => a.userId === session);
    return a ? Store.prettyPhone(a.phone) : '';
  }

  function fmtClock(s) {
    s = Math.max(0, Math.ceil(s));
    return '00:' + String(s).padStart(2, '0');
  }

  function bellUnread() {
    return db.earnings.some(e => e.ts > (db.notifRead || 0) && e.amount > 0);
  }

  /* ============================================================
     shared partials
     ============================================================ */

  const RECORD_ICON = {
    task: 'music', commission: 'users', withdraw: 'arrowup',
    deposit: 'arrowdown', bonus: 'gift', vip: 'crown'
  };

  function recordRow(e) {
    const credit = e.amount > 0;
    return (
      '<div class="record">' +
        '<span class="r-ic ' + (credit ? 'cred' : 'deb') + '">' + icon(RECORD_ICON[e.type] || 'sparkle') + '</span>' +
        '<div class="r-mid"><b>' + esc(e.label) + '</b><span>' + timeAgo(e.ts) + ' ago</span></div>' +
        '<span class="r-amt ' + (credit ? 'cred' : 'deb') + '">' + (credit ? '+' : '') + fmtLKR(e.amount).replace('LKR ', '') + '</span>' +
      '</div>'
    );
  }

  function trackRow(t) {
    const p = prefs();
    const done = !!p.tasksDone[t.id];
    const isLocked = locked(t);
    return (
      '<button class="task-row' + (done ? ' done' : '') + '" data-action="open-task" data-tid="' + esc(t.id) + '">' +
        '<span class="tr-cover"><img src="' + esc(t.cover) + '" alt="">' +
          (done ? '<span class="tr-done">' + icon('check') + '</span>' : '') +
        '</span>' +
        '<span class="tr-mid">' +
          '<span class="tr-title">' + esc(t.title) + '</span>' +
          '<span class="tr-sub">' + esc(t.artist) + ' · ' + esc(t.genre) + ' · ' + t.duration + 's</span>' +
        '</span>' +
        '<span class="tr-side">' +
          (isLocked
            ? '<span class="lock-chip">' + icon('lock') + ' ' + Store.VIP[t.vipMin].name + '</span>'
            : '<span class="reward-chip">+' + fmtLKR(rewardFor(t)).replace('LKR ', '') + '</span>') +
          (done ? '<span class="tr-state">Done today</span>'
                : isLocked ? '<span class="tr-state">Locked</span>'
                : '<span class="tr-state">Play</span>') +
        '</span>' +
      '</button>'
    );
  }

  function hotCard(t) {
    const p = prefs();
    const done = !!p.tasksDone[t.id];
    return (
      '<button class="hot-card' + (done ? ' done' : '') + '" data-action="open-task" data-tid="' + esc(t.id) + '">' +
        '<span class="hc-cover"><img src="' + esc(t.cover) + '" alt="">' +
          (locked(t) ? '<span class="hc-lock">' + icon('lock') + '</span>' : '') +
        '</span>' +
        '<span class="hc-title">' + esc(t.title) + '</span>' +
        '<span class="hc-sub">' + (done ? '✔ Done' : '+' + fmtLKR(rewardFor(t)).replace('LKR ', '')) + '</span>' +
      '</button>'
    );
  }

  function qBtn(action, ic, label) {
    return '<button class="q-btn" data-action="' + action + '">' + icon(ic) + '<span>' + label + '</span></button>';
  }

  function bellBtn() {
    return '<button class="icon-btn" data-action="notifications" aria-label="Notifications">' +
      icon('bell') + (bellUnread() ? '<span class="dot"></span>' : '') + '</button>';
  }

  /* ============================================================
     VIEW: home dashboard
     ============================================================ */

  function renderHome() {
    const p = prefs();
    const done = tasksDoneToday();
    const limit = vipInfo().daily;
    const hot = db.tracks.slice().sort((a, b) => b.reward - a.reward).slice(0, 5);
    const recent = db.earnings.slice().sort((a, b) => b.ts - a.ts).slice(0, 4);

    $view.innerHTML =
      '<header class="topbar">' +
        '<span class="brand">NICE</span>' + bellBtn() +
      '</header>' +

      '<div class="marquee" aria-label="Notice"><span>' +
        esc(db.notices.join('　·　')) +
      '</span></div>' +

      '<div class="dash-card">' +
        '<div class="dc-row">' +
          '<div><b>' + fmtLKR(p.wallet) + '</b><span>Account balance</span></div>' +
          '<span class="vip-tag">' + icon('crown') + ' ' + vipInfo().name + '</span>' +
        '</div>' +
        '<div class="dc-stats">' +
          '<div class="ds"><b>' + fmtLKR(todayEarned()).replace('LKR ', '') + '</b><span>Earned today</span></div>' +
          '<div class="ds"><b>' + done + '/' + limit + '</b><span>Tasks today</span></div>' +
          '<div class="ds"><b>' + db.team.length + '</b><span>Team members</span></div>' +
        '</div>' +
        '<div class="taskbar"><div class="taskbar-fill" style="width:' + Math.min(100, Math.round(done / limit * 100)) + '%"></div></div>' +
        '<p class="dc-note">' + (remainingTasks() > 0
          ? '🎵 ' + remainingTasks() + ' task' + (remainingTasks() === 1 ? '' : 's') + ' available today'
          : '🎉 Daily tasks complete — come back tomorrow!') + '</p>' +
      '</div>' +

      '<div class="quick-grid">' +
        qBtn('start', 'play', 'Start task') +
        qBtn('go-wallet', 'wallet', 'Wallet') +
        qBtn('go-team', 'users', 'Invite') +
        qBtn('vip', 'crown', 'Upgrade') +
      '</div>' +

      '<div class="section-title">Today’s hot tracks <a href="#/music">All tasks</a></div>' +
      '<div class="hot-row">' + hot.map(hotCard).join('') + '</div>' +

      '<div class="section-title">Recent activity <a href="#/wallet">Wallet</a></div>' +
      '<div class="record-list">' + recent.map(recordRow).join('') + '</div>';

    $view.scrollTop = 0;
  }

  /* ============================================================
     VIEW: music tasks
     ============================================================ */

  function renderMusic() {
    const done = tasksDoneToday();
    const limit = vipInfo().daily;
    $view.innerHTML =
      '<header class="topbar"><span class="brand" style="letter-spacing:.12em">Music Tasks</span>' + bellBtn() + '</header>' +
      '<div class="dash-card slim">' +
        '<div class="dc-stats">' +
          '<div class="ds"><b>' + done + '/' + limit + '</b><span>Completed today</span></div>' +
          '<div class="ds"><b>' + fmtLKR(todayEarned()).replace('LKR ', '') + '</b><span>Earned today</span></div>' +
          '<div class="ds"><b>' + remainingTasks() + '</b><span>Remaining</span></div>' +
        '</div>' +
        '<div class="taskbar"><div class="taskbar-fill" style="width:' + Math.min(100, Math.round(done / limit * 100)) + '%"></div></div>' +
      '</div>' +
      '<div class="track-list">' + db.tracks.map(trackRow).join('') + '</div>' +
      '<p class="hint" style="text-align:center;padding:0 20px 24px">Listen for the full duration to complete a task and ' +
      'credit the reward to your wallet. Tracks marked ' + icon('lock') + ' need a higher VIP level.</p>';
    $view.scrollTop = 0;
  }

  /* ============================================================
     task player (overlay)
     ============================================================ */

  const RING_C = 2 * Math.PI * 54;   /* r=54 → circumference ≈ 339.3 */

  function openTask(tid) {
    const t = trackById(tid);
    if (!t) return;
    const p = prefs();
    const already = !!p.tasksDone[t.id];

    if (locked(t)) {
      toast('This track requires ' + Store.VIP[t.vipMin].name + ' — upgrade to unlock 🔒', 'error');
      openVIP();
      return;
    }
    if (!already && remainingTasks() <= 0) {
      toast('Daily limit reached (' + vipInfo().daily + ' tasks) — upgrade VIP for more');
      return;
    }

    const reward = rewardFor(t);
    $overlay.innerHTML =
      '<div class="player" style="background:linear-gradient(165deg,' + t.colors[0] + ',' + t.colors[1] + ')">' +
        '<div class="pl-top">' +
          '<button class="pl-close" data-action="close-player" aria-label="Close">' + icon('back') + '</button>' +
          '<span class="pl-head">Now playing · Task</span>' +
          '<span class="pl-reward">+' + fmtLKR(already ? 0 : reward).replace('LKR ', '') + '</span>' +
        '</div>' +
        '<div class="pl-art">' +
          '<img class="pl-cover" src="' + esc(t.cover) + '" alt="">' +
        '</div>' +
        '<div class="pl-ring">' +
          '<svg viewBox="0 0 120 120" aria-hidden="true">' +
            '<circle class="ring-bg" cx="60" cy="60" r="54"/>' +
            '<circle class="ring-fg" id="pl-ring" cx="60" cy="60" r="54"/>' +
          '</svg>' +
          '<span id="pl-time">' + fmtClock(t.duration) + '</span>' +
        '</div>' +
        '<div class="pl-meta">' +
          '<b>' + esc(t.title) + '</b>' +
          '<span>' + esc(t.artist) + ' · ' + esc(t.genre) + '</span>' +
        '</div>' +
        (already
          ? '<p class="pl-note">You already completed this task today — replay for fun, no reward.</p>'
          : '<p class="pl-note">Keep the player open to earn <b>+' + fmtLKR(reward).replace('LKR ', '') + '</b></p>') +
        '<div class="pl-controls">' +
          '<button class="pl-play" data-action="toggle-play" aria-label="Pause">' + icon('pause') + '</button>' +
        '</div>' +
        '<button class="pl-ff" data-action="ff">Demo: fast-forward ⏩</button>' +
      '</div>';

    const ring = document.getElementById('pl-ring');
    ring.style.strokeDasharray = RING_C;
    ring.style.strokeDashoffset = 0;

    let finished = false;

    function onTick(remain) {
      const time = document.getElementById('pl-time');
      if (time) time.textContent = fmtClock(remain);
      const r = document.getElementById('pl-ring');
      if (r) r.style.strokeDashoffset = RING_C * (1 - remain / t.duration);
    }

    function onEnd() {
      if (finished) return;
      finished = true;
      completeTask(t);
    }

    window.Synth.start(t, onTick, onEnd);
  }

  function togglePlay() {
    const S = window.Synth;
    const btn = $overlay.querySelector('.pl-play');
    if (!btn) return;
    if (S.playing) {
      S.pause();
      btn.innerHTML = icon('play');
      btn.setAttribute('aria-label', 'Play');
    } else {
      S.resume();
      btn.innerHTML = icon('pause');
      btn.setAttribute('aria-label', 'Pause');
    }
  }

  function closePlayer() {
    window.Synth.stop();
    $overlay.innerHTML = '';
    render();   /* refresh counters/earnings behind the player */
  }

  function completeTask(t) {
    const p = prefs();
    const already = !!p.tasksDone[t.id];
    let reward = 0;

    if (!already) {
      reward = rewardFor(t);
      p.tasksDone[t.id] = Date.now();
      p.wallet += reward;
      db.earnings.push({ type: 'task', label: 'Task reward · ' + t.title, amount: reward, ts: Date.now() });
      Store.saveDB();
    }

    const next = nextAvailableTrack();
    $overlay.innerHTML =
      '<div class="player success" style="background:linear-gradient(165deg,' + t.colors[0] + ',' + t.colors[1] + ')">' +
        '<div class="pl-top"><span class="pl-head"></span><span class="pl-reward"></span></div>' +
        '<div class="check-circle">' + icon('check') + '</div>' +
        '<h2 class="suc-title">' + (reward ? 'Task complete!' : 'Replay finished') + '</h2>' +
        '<p class="suc-amt">' + (reward
          ? '<b>+' + fmtLKR(reward) + '</b> added to your wallet'
          : 'No reward — this task was already completed today') + '</p>' +
        '<div class="suc-btns">' +
          (next
            ? '<button class="btn-light" data-action="next-task" data-tid="' + esc(next.id) + '">' + icon('play') + ' Next task +' + fmtLKR(rewardFor(next)).replace('LKR ', '') + '</button>'
            : '<button class="btn-light" data-action="go-music">View all tasks</button>') +
          '<button class="btn-outline" data-action="close-player">' + (reward ? 'Done' : 'Close') + '</button>' +
        '</div>' +
        '<div class="suc-stats">' +
          '<div class="ds"><b>' + tasksDoneToday() + '/' + vipInfo().daily + '</b><span>Tasks today</span></div>' +
          '<div class="ds"><b>' + fmtLKR(prefs().wallet).replace('LKR ', '') + '</b><span>Balance</span></div>' +
        '</div>' +
      '</div>';
  }

  function nextAvailableTrack() {
    if (remainingTasks() <= 0) return null;
    return db.tracks.find(t => !prefs().tasksDone[t.id] && !locked(t)) || null;
  }

  function openNextTask() {
    const t = nextAvailableTrack();
    if (!t) {
      toast('All daily tasks done (' + vipInfo().daily + '/' + vipInfo().daily + ') 🎉');
      location.hash = '#/music';
      return;
    }
    openTask(t.id);
  }

  /* ============================================================
     VIEW: wallet
     ============================================================ */

  function renderWallet() {
    const p = prefs();
    const records = db.earnings.slice().sort((a, b) => b.ts - a.ts);
    $view.innerHTML =
      '<header class="topbar"><span class="brand" style="letter-spacing:.12em">Wallet</span>' + bellBtn() + '</header>' +
      '<div class="dash-card">' +
        '<div class="dc-row"><div><b>' + fmtLKR(p.wallet) + '</b><span>Available balance</span></div>' +
          '<span class="vip-tag">' + icon('crown') + ' ' + vipInfo().name + '</span></div>' +
        '<div class="dc-btns">' +
          '<button class="btn-light" data-action="withdraw">' + icon('arrowup') + ' Withdraw</button>' +
          '<button class="btn-outline" data-action="deposit">' + icon('arrowdown') + ' Deposit</button>' +
        '</div>' +
      '</div>' +
      '<div class="w-stats">' +
        '<div class="ws"><b>' + fmtLKR(todayEarned()).replace('LKR ', '') + '</b><span>Earned today</span></div>' +
        '<div class="ws"><b>' + fmtLKR(totalEarned()).replace('LKR ', '') + '</b><span>Total earned</span></div>' +
        '<div class="ws"><b>' + fmtLKR(totalWithdrawn()).replace('LKR ', '') + '</b><span>Withdrawn</span></div>' +
      '</div>' +
      '<div class="section-title">Records</div>' +
      '<div class="record-list">' + records.map(recordRow).join('') + '</div>';
    $view.scrollTop = 0;
  }

  function openWithdraw() {
    const p = prefs();
    const feeRate = vipLevel() >= 2 ? 0 : 0.02;
    openModal(
      '<div class="doc">' +
        '<h3>Withdraw funds</h3>' +
        '<div class="wallet-row"><div><b>' + fmtLKR(p.wallet) + '</b><span>Available balance</span></div></div>' +
        '<form id="wd-form">' +
          '<div class="field">' + icon('wallet') +
            '<input id="wd-amount" type="number" inputmode="numeric" min="1" placeholder="Amount (min 500)" aria-label="Amount">' +
          '</div>' +
          '<div class="field">' + icon('card') +
            '<select id="wd-method" aria-label="Method">' +
              '<option>Bank transfer</option>' +
              '<option>eZ Cash</option>' +
              '<option>Dialog e-Wallet</option>' +
              '<option>USSD Cash</option>' +
            '</select>' +
          '</div>' +
          '<p class="hint">Fee: ' + (feeRate ? '2%' : '0% (VIP 2+)') + ' · minimum LKR 500 · demo only, no real transfer</p>' +
          '<button class="btn-primary" type="submit">Withdraw</button>' +
        '</form>' +
      '</div>'
    );
    document.getElementById('wd-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = Math.floor(Number(document.getElementById('wd-amount').value) || 0);
      const method = document.getElementById('wd-method').value;
      if (amount < 500) { toast('Minimum withdrawal is LKR 500', 'error'); return; }
      if (amount > p.wallet) { toast('Insufficient balance', 'error'); return; }
      const fee = Math.round(amount * feeRate);
      p.wallet -= amount;
      db.earnings.push({ type: 'withdraw', label: 'Withdrawal · ' + method, amount: -amount, ts: Date.now() });
      Store.saveDB();
      closeModal();
      toast('Withdrawal submitted — ' + fmtLKR(amount - fee) + ' will arrive (demo)');
      renderWallet();
    });
  }

  function openDeposit() {
    const p = prefs();
    const wrap = openModal(
      '<div class="doc">' +
        '<h3>Deposit funds</h3>' +
        '<div class="wallet-row"><div><b>' + fmtLKR(p.wallet) + '</b><span>Current balance</span></div></div>' +
        '<p class="hint" style="margin:0 2px 10px">Demo mode — pick an amount to add play money. No real payment happens.</p>' +
        '<div class="dep-grid">' +
          [1000, 5000, 10000].map(a =>
            '<button class="dep-btn" data-dep="' + a + '">+' + fmtLKR(a) + '</button>').join('') +
        '</div>' +
        '<button class="btn-ghost" data-close="1" style="margin-top:12px">Close</button>' +
      '</div>'
    );
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dep]');
      if (!b) return;
      const amount = Number(b.dataset.dep);
      p.wallet += amount;
      db.earnings.push({ type: 'deposit', label: 'Deposit (demo)', amount, ts: Date.now() });
      Store.saveDB();
      closeModal();
      toast('Deposited ' + fmtLKR(amount) + ' (demo) 💳');
      renderWallet();
    });
  }

  /* ============================================================
     VIEW: team
     ============================================================ */

  function renderTeam() {
    const todayComm = Math.round(db.team.reduce((s, m) => s + m.today, 0) * 0.08);
    $view.innerHTML =
      '<header class="topbar"><span class="brand" style="letter-spacing:.12em">My Team</span>' + bellBtn() + '</header>' +

      '<div class="dash-card">' +
        '<div class="dc-row"><div><b>' + db.team.length + '</b><span>Team members</span></div>' +
          '<span class="vip-tag">' + icon('users') + ' L1 8% · L2 3%</span></div>' +
        '<div class="dc-stats">' +
          '<div class="ds"><b>' + fmtLKR(todayComm).replace('LKR ', '') + '</b><span>Commission today</span></div>' +
          '<div class="ds"><b>' + fmtLKR(db.teamCommTotal).replace('LKR ', '') + '</b><span>Total commission</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="invite-card">' +
        '<div class="iv-row"><span>Invite code</span><code>' + esc(db.inviteCode) + '</code></div>' +
        '<div class="iv-row"><span>Invite link</span><code class="iv-link" id="iv-link">https://nicemktlk.com/#/register?code=' + esc(db.inviteCode) + '</code></div>' +
        '<button class="btn-light" data-action="copy" data-copy="' + esc(db.inviteCode) + '">' + icon('copy') + ' Copy code</button>' +
      '</div>' +
      '<p class="hint" style="margin:0 16px 4px">Earn 8% of your direct referrals’ task rewards — paid to your wallet automatically.</p>' +

      '<div class="section-title">Members</div>' +
      '<div class="record-list">' +
        db.team.map(m =>
          '<div class="record">' +
            '<span class="r-ic grad">' + icon('users') + '</span>' +
            '<div class="r-mid"><b>' + esc(m.name) + '</b><span>' + Store.VIP[m.level].name + ' · joined ' + m.joinedDays + 'd ago · today ' + fmtLKR(m.today).replace('LKR ', '') + '</span></div>' +
            '<span class="r-amt cred">' + fmtLKR(m.total).replace('LKR ', '') + '</span>' +
          '</div>').join('') +
      '</div>';
    $view.scrollTop = 0;
  }

  /* ============================================================
     VIEW: profile
     ============================================================ */

  function renderProfile() {
    const p = prefs();
    const u = meUser();

    $view.innerHTML =
      '<div class="profile-cover"></div>' +
      '<div class="profile-head">' +
        avatarHTML(Object.assign({}, u, { name: myName() }), 84, { cls: 'big' }) +
        '<div class="p-name">' + esc(myName()) + ' ' + (vipLevel() > 0 ? badgeVIP(17) : '') + '</div>' +
        '<div class="p-handle">@' + esc(u.handle) + (myPhone() ? ' · ' + esc(myPhone()) : '') + '</div>' +
        '<div class="p-stats">' +
          '<div class="st"><b>' + fmtLKR(p.wallet).replace('LKR ', '') + '</b><span>Balance</span></div>' +
          '<div class="st"><b>' + tasksDoneToday() + '/' + vipInfo().daily + '</b><span>Tasks</span></div>' +
          '<div class="st"><b>' + db.team.length + '</b><span>Team</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="vip-card ' + (vipLevel() > 0 ? 'active' : '') + '">' +
        '<div class="row1">' + icon('crown') + (vipLevel() > 0 ? 'NICE ' + vipInfo().name + ' · active' : 'Free member') + '</div>' +
        '<p>' + (vipLevel() > 0
          ? vipInfo().daily + ' daily tasks · ×' + vipInfo().rewardMult + ' rewards' +
            (vipLevel() < 2 ? ' · 2% withdrawal fee' : ' · 0% withdrawal fee')
          : 'Upgrade to unlock more daily tasks, bigger rewards and lower fees.') + '</p>' +
        '<button class="cta" data-action="vip">' + icon('sparkle') +
          (vipLevel() > 0 ? 'Manage membership' : 'Get VIP') + '</button>' +
      '</div>' +

      '<div class="settings-list">' +
        '<button class="settings-item" data-action="edit-profile">' + icon('user') + '<span class="grow">Edit profile</span>' + icon('arrowright') + '</button>' +
        '<button class="settings-item" data-action="go-wallet">' + icon('wallet') + '<span class="grow">Wallet &amp; VIP</span>' + icon('arrowright') + '</button>' +
        '<button class="settings-item" data-action="go-team">' + icon('users') + '<span class="grow">My team</span>' + icon('arrowright') + '</button>' +
        '<button class="settings-item" data-action="toggle-notifs">' + icon('bell') + '<span class="grow">Notifications</span>' +
          '<span class="switch ' + (p.notifsOn ? 'on' : '') + '"></span></button>' +
        '<button class="settings-item" data-action="about">' + icon('sparkle') + '<span class="grow">About this demo</span>' + icon('arrowright') + '</button>' +
        '<button class="settings-item" data-action="reset">' + icon('sliders') + '<span class="grow">Reset demo data</span>' + icon('arrowright') + '</button>' +
        '<button class="settings-item danger" data-action="logout">' + icon('logout') + '<span class="grow">Log out</span>' + icon('arrowright') + '</button>' +
      '</div>';

    $view.scrollTop = 0;
  }

  function openEditProfile() {
    const p = prefs();
    openModal(
      '<div class="doc">' +
        '<h3>Edit profile</h3>' +
        '<form id="profile-form">' +
          '<div class="field" style="margin-top:8px">' + icon('user') +
            '<input id="pf-name" type="text" maxlength="30" placeholder="Display name" value="' + esc(myName()) + '">' +
          '</div>' +
          '<button class="btn-primary" type="submit">Save changes</button>' +
        '</form>' +
      '</div>'
    );
    document.getElementById('profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('pf-name').value.trim();
      if (!name) { toast('Name can’t be empty', 'error'); return; }
      p.profile = { name };
      Store.saveDB();
      closeModal();
      toast('Profile updated ✔');
      renderProfile();
    });
  }

  /* ============================================================
     VIP modal
     ============================================================ */

  function openVIP() {
    const p = prefs();
    const cur = vipLevel();
    let sel = Math.min(cur + 1, Store.VIP.length - 1);

    const wrap = openModal(
      '<div class="doc">' +
        '<h3>' + icon('crown') + ' NICE VIP</h3>' +
        '<div class="wallet-row"><div><b id="wallet-amt">' + fmtLKR(p.wallet) + '</b><span>Wallet balance (demo)</span></div>' +
          '<button class="follow-btn" data-vip="recharge">' + icon('card') + ' Recharge +1,000</button></div>' +
        '<div id="plan-list">' +
          Store.VIP.map(v =>
            '<div class="plan' + (v.level === sel ? ' sel' : '') + (v.level === cur ? ' cur' : '') + '" data-plan="' + v.level + '">' +
              (v.level === cur ? '<span class="save-pill">Current</span>' : '') +
              '<div class="p-t"><span>' + v.name + '</span>' +
                '<span class="p-p">' + (v.price ? fmtLKR(v.price) + '<i>/mo</i>' : 'Free') + '</span></div>' +
              '<ul>' +
                '<li>' + icon('check') + v.daily + ' listening tasks daily</li>' +
                '<li>' + icon('check') + (v.rewardMult > 1 ? '×' + v.rewardMult + ' task rewards' : 'Standard rewards') + '</li>' +
                '<li>' + icon('check') + (v.level >= 2 ? '0% withdrawal fee' : '2% withdrawal fee') + '</li>' +
              '</ul>' +
            '</div>').join('') +
        '</div>' +
        '<button class="btn-primary" id="vip-subscribe" data-vip="subscribe">' +
          (cur === 0 ? 'Upgrade now' : 'Upgrade / extend') + '</button>' +
        '<p class="hint" style="text-align:center;margin-top:10px">Demo only — no real payments happen here.</p>' +
      '</div>'
    );

    wrap.addEventListener('click', (e) => {
      const plan = e.target.closest('[data-plan]');
      if (plan && !plan.classList.contains('cur')) {
        sel = Number(plan.dataset.plan);
        wrap.querySelectorAll('.plan').forEach(el => el.classList.remove('sel'));
        plan.classList.add('sel');
        return;
      }
      const act = e.target.closest('[data-vip]');
      if (!act) return;
      if (act.dataset.vip === 'recharge') {
        p.wallet += 1000;
        Store.saveDB();
        const w = wrap.querySelector('#wallet-amt');
        if (w) w.textContent = fmtLKR(p.wallet);
        toast('Recharged ' + fmtLKR(1000) + ' (demo) 💳');
      } else if (act.dataset.vip === 'subscribe') {
        if (sel <= cur) {
          toast('You’re already on ' + vipInfo(cur).name, 'error');
          return;
        }
        const price = Store.VIP[sel].price;
        if (p.wallet < price) {
          toast('Not enough balance — recharge first (demo)', 'error');
          return;
        }
        p.wallet -= price;
        p.vip = sel;
        db.earnings.push({ type: 'vip', label: Store.VIP[sel].name + ' membership · 1 month', amount: -price, ts: Date.now() });
        Store.saveDB();
        toast('Welcome to ' + Store.VIP[sel].name + '! ' + Store.VIP[sel].daily + ' tasks/day unlocked 👑');
        closeModal();
        render();
      }
    });
  }

  function openAbout() {
    openModal(
      '<div class="doc">' +
        '<h3>About this demo</h3>' +
        '<p>This is a <b>static, front-end recreation</b> of the NICE web app (nicemktlk.com) — ' +
        'a music listening task platform — built with plain HTML, CSS and JavaScript for learning purposes.</p>' +
        '<h4>What’s inside</h4>' +
        '<p>· Login &amp; registration with demo credentials<br>' +
        '· Dashboard with balance, notices and daily task progress<br>' +
        '· Music tasks with a live-synthesized player (WebAudio)<br>' +
        '· Wallet with withdrawals, deposits and records<br>' +
        '· Team referrals and VIP membership tiers</p>' +
        '<h4>Your data</h4>' +
        '<p>Everything is stored in your browser’s localStorage only. ' +
        'No servers, no tracking, no real payments. Not affiliated with the original site.</p>' +
        '<button class="btn-primary" data-close="1">Nice!</button>' +
      '</div>'
    );
  }

  /* ============================================================
     notifications
     ============================================================ */

  function openNotifications() {
    const items = db.earnings
      .slice().sort((a, b) => b.ts - a.ts)
      .slice(0, 8)
      .map(e => ({
        icon: RECORD_ICON[e.type] || 'sparkle',
        text: (e.amount > 0 ? '+' : '') + fmtLKR(e.amount).replace('LKR ', '') + ' · ' + e.label,
        ts: e.ts
      }));
    items.unshift({ icon: 'sparkle', text: db.notices[0], ts: Date.now() });

    openModal(
      '<div class="doc"><h3>Notifications</h3>' +
      items.map(n =>
        '<div class="notif">' +
          '<span class="r-ic grad">' + icon(n.icon) + '</span>' +
          '<div class="nt">' + esc(n.text) + '<span class="tm">' + timeAgo(n.ts) + ' ago</span></div>' +
        '</div>').join('') +
      '</div>'
    );
    db.notifRead = Date.now();
    Store.saveDB();
    const dot = $view.querySelector('[data-action="notifications"] .dot');
    if (dot) dot.remove();
  }

  /* ============================================================
     misc actions
     ============================================================ */

  function copyText(text) {
    const done = () => toast('Copied: ' + text + ' 🔗');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    } catch (e) {
      toast('Copy not available — code: ' + text);
    }
  }

  function confirmModal(title, body, okLabel, onOk) {
    const wrap = openModal(
      '<div class="doc" style="text-align:center">' +
        '<h3 style="padding-right:0">' + esc(title) + '</h3>' +
        '<p style="margin-top:6px">' + esc(body) + '</p>' +
        '<button class="btn-primary" id="confirm-ok" style="margin-top:18px">' + esc(okLabel) + '</button>' +
        '<button class="btn-ghost" data-close="1" style="margin-top:10px">Cancel</button>' +
      '</div>', { cls: 'center' }
    );
    wrap.querySelector('#confirm-ok').addEventListener('click', onOk);
  }

  function doLogout() {
    confirmModal('Log out?', 'You can log back in anytime with the demo credentials.', 'Log out', () => {
      Store.clearSession();
      closeModal();
      location.replace('index.html');
    });
  }

  function doReset() {
    confirmModal(
      'Reset demo data?',
      'This erases every change you made (tasks, wallet, VIP, new accounts) and restores the original demo state.',
      'Reset everything',
      () => {
        Store.reset();
        location.replace('index.html');
      }
    );
  }

  /* ============================================================
     router + nav
     ============================================================ */

  const ROUTES = {
    home: renderHome,
    music: renderMusic,
    wallet: renderWallet,
    team: renderTeam,
    profile: renderProfile
  };

  function currentRoute() {
    const r = location.hash.replace(/^#\/?/, '') || 'home';
    return ROUTES[r] ? r : 'home';
  }

  function render() {
    const r = currentRoute();
    window.Synth.stop();
    $overlay.innerHTML = '';
    closeModal();
    ROUTES[r]();
    updateNav();
  }

  function updateNav() {
    document.querySelectorAll('#tabbar a').forEach(a => {
      a.classList.toggle('active', a.dataset.route === currentRoute());
    });
  }

  function setNavIcons() {
    document.getElementById('nav-home').querySelector('.nav-ic').innerHTML = icon('home');
    document.getElementById('nav-music').querySelector('.nav-ic').innerHTML = icon('music');
    document.getElementById('nav-start').querySelector('.start-btn').innerHTML = icon('play');
    document.getElementById('nav-wallet').querySelector('.nav-ic').innerHTML = icon('wallet');
    document.getElementById('nav-profile').querySelector('.nav-ic').innerHTML = icon('user');
  }

  /* ============================================================
     global event delegation
     ============================================================ */

  document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    switch (el.dataset.action) {
      case 'start': openNextTask(); break;
      case 'open-task': openTask(el.dataset.tid); break;
      case 'next-task': openTask(el.dataset.tid); break;
      case 'toggle-play': togglePlay(); break;
      case 'ff': window.Synth.finishNow(); break;
      case 'close-player': closePlayer(); break;
      case 'go-music': $overlay.innerHTML = ''; window.Synth.stop(); location.hash = '#/music'; break;

      case 'go-wallet': location.hash = '#/wallet'; break;
      case 'go-team': location.hash = '#/team'; break;
      case 'withdraw': openWithdraw(); break;
      case 'deposit': openDeposit(); break;

      case 'notifications': openNotifications(); break;
      case 'vip': openVIP(); break;
      case 'edit-profile': openEditProfile(); break;
      case 'about': openAbout(); break;

      case 'copy': copyText(el.dataset.copy); break;

      case 'toggle-notifs': {
        const p = prefs();
        p.notifsOn = !p.notifsOn;
        Store.saveDB();
        el.querySelector('.switch').classList.toggle('on', p.notifsOn);
        toast('Notifications ' + (p.notifsOn ? 'on' : 'off'));
        break;
      }
      case 'reset': doReset(); break;
      case 'logout': doLogout(); break;
    }
  });

  /* ============================================================
     boot
     ============================================================ */

  window.addEventListener('hashchange', render);
  setNavIcons();
  prefs();      /* ensures per-user state + daily reset exist */
  render();
})();
