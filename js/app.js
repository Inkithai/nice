/* ============================================================
   NICE (demo clone) — app logic
   Views: home feed, discover, publish, messages, profile
   All state lives in localStorage via Store.
   ============================================================ */
(function () {
  'use strict';

  const { Store, UI } = window;
  const {
    icon, heartFilled, badgeVerified, badgeVIP, avatarHTML,
    esc, timeAgo, fmtCount, fmtLKR, toast, openModal, closeModal
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

  /* ---------- data helpers ---------- */

  function userById(id) { return db.users.find(u => u.id === id); }
  function me() { return userById(session) || db.users[0]; }

  /* per-user preferences (vip, wallet, profile edits, notifications) */
  function prefs() {
    if (!db.perUser) db.perUser = {};
    if (!db.perUser[session]) {
      db.perUser[session] = { vip: session === Store.ME, wallet: 1500, profile: {}, notifsOn: true };
    }
    return db.perUser[session];
  }

  function myName() { return (prefs().profile.name || me().name); }
  function myBio() { return (prefs().profile.bio || me().bio || ''); }

  function postById(id) { return db.posts.find(p => p.id === id); }

  function sortedPosts() { return db.posts.slice().sort((a, b) => b.ts - a.ts); }
  function myPosts() { return sortedPosts().filter(p => p.userId === session); }

  function likeState(p) { return (p.id in db.likes) ? !!db.likes[p.id] : !!p.liked; }
  function likeCount(p) {
    const on = likeState(p);
    return (p.likes || 0) + (on && !p.liked ? 1 : 0) - (!on && p.liked ? 1 : 0);
  }
  function allComments(p) { return (p.comments || []).concat(db.extraComments[p.id] || []); }
  function followState(uid) { return !!db.follows[uid]; }

  function fmtTime(ts) {
    const d = new Date(ts), n = new Date();
    const sameDay = d.toDateString() === n.toDateString();
    if (sameDay) {
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    return timeAgo(ts);
  }

  /* ============================================================
     shared partials
     ============================================================ */

  function postCard(p) {
    const u = userById(p.userId) || me();
    const liked = likeState(p);
    const comments = allComments(p);
    const mine = p.userId === session;
    const following = followState(u.id);
    const last = comments[comments.length - 1];

    return (
      '<article class="post" data-post="' + esc(p.id) + '">' +
        '<div class="post-head">' +
          avatarHTML(u, 42) +
          '<div class="who">' +
            '<div class="nm">' + esc(u.name) + ' ' + (u.verified ? badgeVerified() : '') + (u.vip ? badgeVIP() : '') + '</div>' +
            '<div class="sub">' + icon('pin') + esc(p.location || 'Sri Lanka') + ' · ' + timeAgo(p.ts) + '</div>' +
          '</div>' +
          (mine ? '' :
            '<button class="follow-btn ' + (following ? 'on' : '') + '" data-action="follow" data-uid="' + u.id + '">' +
            (following ? 'Following' : 'Follow') + '</button>') +
        '</div>' +
        '<img class="post-img" src="' + esc(p.image) + '" alt="' + esc(p.caption).slice(0, 80) + '" loading="lazy">' +
        '<div class="post-body">' +
          '<div class="post-actions">' +
            '<button class="pa ' + (liked ? 'liked' : '') + '" data-action="like" data-pid="' + esc(p.id) + '" aria-label="Like">' +
              (liked ? heartFilled() : icon('heart')) +
              '<span>' + fmtCount(likeCount(p)) + '</span>' +
            '</button>' +
            '<button class="pa" data-action="comments" data-pid="' + esc(p.id) + '" aria-label="Comments">' +
              icon('comment') + '<span>' + comments.length + '</span>' +
            '</button>' +
            '<button class="pa" data-action="share" data-pid="' + esc(p.id) + '" aria-label="Share">' +
              icon('share') + '<span>Share</span>' +
            '</button>' +
          '</div>' +
          '<p class="caption"><b>' + esc(u.name) + '</b> ' + esc(p.caption) + '</p>' +
          (p.tags && p.tags.length
            ? '<div class="tags">' + p.tags.map(t =>
                '<button class="tag-chip" data-action="tag" data-tag="' + esc(t) + '">#' + esc(t) + '</button>').join('') + '</div>'
            : '') +
          '<div class="comment-preview" data-action="comments" data-pid="' + esc(p.id) + '">' +
            (last ? '<b>@' + esc(last.handle) + '</b> ' + esc(last.text)
                  : 'Be the first to comment…') +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function gridItem(p) {
    return (
      '<div class="gi" data-action="open-post" data-pid="' + esc(p.id) + '">' +
        '<img src="' + esc(p.image) + '" alt="" loading="lazy">' +
        '<span class="hl">' + (likeState(p) ? heartFilled('sm') : icon('heart')) + ' ' + fmtCount(likeCount(p)) + '</span>' +
      '</div>'
    );
  }

  /* ============================================================
     VIEW: home
     ============================================================ */

  function storyUsers() {
    const others = db.users
      .filter(u => u.id !== session)
      .map(u => ({ user: u, post: sortedPosts().find(p => p.userId === u.id) }))
      .filter(s => s.post);
    const mine = { user: me(), post: myPosts()[0], isMe: true };
    return (mine.post ? [mine] : []).concat(others);
  }

  function renderHome() {
    const all = storyUsers();
    const mineIncluded = all.length > 0 && all[0].isMe;
    const friends = mineIncluded ? all.slice(1) : all;

    let html =
      '<header class="topbar">' +
        '<span class="brand">NICE</span>' +
        '<button class="icon-btn" data-action="notifications" aria-label="Notifications">' +
          icon('bell') + (db.notifRead ? '' : '<span class="dot"></span>') +
        '</button>' +
      '</header>';

    /* stories */
    html += '<div class="stories">';
    html +=
      '<button class="story" data-action="my-story">' +
        '<span class="ring"><span class="add-story">' +
          avatarHTML(me(), 52) +
          '<span class="plus-mini">+</span>' +
        '</span></span>' +
        '<span>Your story</span>' +
      '</button>';
    friends.forEach((s, i) => {
      html +=
        '<button class="story" data-action="story" data-idx="' + (mineIncluded ? i + 1 : i) + '">' +
          '<span class="ring">' + avatarHTML(s.user, 52) + '</span>' +
          '<span>' + esc(s.user.name.split(' ')[0]) + '</span>' +
        '</button>';
    });
    html += '</div>';

    /* feed */
    const feed = sortedPosts();
    html += feed.map(postCard).join('');

    if (!feed.length) {
      html += '<div class="empty">No posts yet — be the first to share something nice ✨</div>';
    }

    $view.innerHTML = html;
    $view.scrollTop = 0;
  }

  /* ============================================================
     VIEW: discover
     ============================================================ */

  let discoverQuery = '';

  function topTags() {
    const counts = {};
    db.posts.forEach(p => (p.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 8);
  }

  function renderDiscover() {
    const tags = topTags();
    const q = discoverQuery.trim().toLowerCase();

    $view.innerHTML =
      '<header class="topbar"><span class="brand" style="letter-spacing:.12em">Discover</span></header>' +
      '<div class="searchbar">' + icon('search') +
        '<input id="discover-q" type="search" placeholder="Search photos, tags, people…" value="' + esc(discoverQuery) + '" autocomplete="off">' +
      '</div>' +
      '<div class="chips-row" id="chip-row">' +
        tags.map(t =>
          '<button class="tag-chip ' + (discoverQuery === '#' + t ? 'on' : '') + '" data-action="tag" data-tag="' + esc(t) + '">#' + esc(t) + '</button>'
        ).join('') +
      '</div>' +
      '<div id="discover-results"></div>' +
      '<div class="divider-label">Suggested for you</div>' +
      '<div id="suggested-users"></div>';

    renderDiscoverResults();
    renderSuggested();

    const $q = document.getElementById('discover-q');
    $q.addEventListener('input', () => { discoverQuery = $q.value; renderDiscoverResults(); });
  }

  function renderDiscoverResults() {
    const $el = document.getElementById('discover-results');
    if (!$el) return;
    let q = discoverQuery.trim().toLowerCase();
    let posts = sortedPosts();

    if (q.startsWith('#')) {
      const tag = q.slice(1).toLowerCase();
      posts = posts.filter(p => (p.tags || []).some(t => t.toLowerCase() === tag));
    } else if (q) {
      posts = posts.filter(p => {
        const u = userById(p.userId) || {};
        return (
          p.caption.toLowerCase().includes(q) ||
          (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (u.name || '').toLowerCase().includes(q) ||
          (u.handle || '').toLowerCase().includes(q)
        );
      });
    }

    $el.innerHTML = posts.length
      ? '<div class="photo-grid">' + posts.map(gridItem).join('') + '</div>'
      : '<div class="empty">Nothing found for “' + esc(discoverQuery) + '” 😢</div>';
  }

  function renderSuggested() {
    const $el = document.getElementById('suggested-users');
    if (!$el) return;
    const suggestions = db.users.filter(u => u.id !== session && !followState(u.id)).slice(0, 6);
    if (!suggestions.length) {
      $el.innerHTML = '<div class="empty">You follow everyone here 🎉</div>';
      return;
    }
    $el.innerHTML = suggestions.map(u =>
      '<div class="user-row">' +
        avatarHTML(u, 46) +
        '<div class="who">' +
          '<div class="nm">' + esc(u.name) + ' ' + (u.verified ? badgeVerified() : '') + '</div>' +
          '<div class="bio">' + esc(u.bio || '') + '</div>' +
        '</div>' +
        '<button class="follow-btn" data-action="follow" data-uid="' + u.id + '">Follow</button>' +
      '</div>'
    ).join('');
  }

  /* ============================================================
     VIEW: publish
     ============================================================ */

  const GALLERY = [
    'images/posts/beach.jpg', 'images/posts/food.jpg', 'images/posts/cat.jpg', 'images/posts/hike.jpg',
    'images/posts/city.jpg', 'images/posts/coffee.jpg', 'images/posts/fashion.jpg', 'images/posts/temple.jpg'
  ];
  const pubState = { image: null };

  function renderPublish() {
    $view.innerHTML =
      '<header class="topbar"><span class="brand" style="letter-spacing:.12em">New post</span></header>' +
      '<div class="pub-wrap">' +
        '<div id="pub-preview"></div>' +
        '<div class="gallery-grid" id="pub-gallery">' +
          GALLERY.map(src =>
            '<button type="button" class="gi' + (pubState.image === src ? ' sel' : '') + '" data-action="pick" data-src="' + src + '">' +
            '<img src="' + src + '" alt=""></button>').join('') +
          '<button type="button" class="gi upload-tile" data-action="upload">' + icon('image') + 'Upload</button>' +
        '</div>' +
        '<textarea class="pub-area" id="pub-caption" maxlength="300" placeholder="Write something nice… ✨"></textarea>' +
        '<div class="pub-row">' + icon('tag') +
          '<input id="pub-tags" type="text" placeholder="Tags — e.g. sunset, travel" autocomplete="off">' +
        '</div>' +
        '<div class="pub-row">' + icon('pin') +
          '<input id="pub-loc" type="text" placeholder="Add location (optional)" autocomplete="off">' +
        '</div>' +
        '<p class="hint">Demo mode: nothing leaves your device — posts are saved in this browser only.</p>' +
        '<button class="btn-primary" data-action="publish">Publish</button>' +
      '</div>';

    renderPublishPreview();
  }

  function renderPublishPreview() {
    const $el = document.getElementById('pub-preview');
    if (!$el) return;
    $el.innerHTML = pubState.image
      ? '<div class="pub-preview"><img src="' + esc(pubState.image) + '" alt="">' +
        '<button class="clear" data-action="clear-img">' + icon('close') + '</button></div>'
      : '<div class="pub-placeholder" data-action="upload">' + icon('camera') + '<span>Tap to choose a photo</span></div>';
  }

  function downscaleImage(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1080;
        let { width: w, height: h } = img;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function doPublish() {
    if (!pubState.image) { toast('Choose a photo first 📷', 'error'); return; }
    const caption = (document.getElementById('pub-caption').value || '').trim();
    const tagRaw = (document.getElementById('pub-tags').value || '');
    const loc = (document.getElementById('pub-loc').value || '').trim();

    const tags = tagRaw.split(/[,\s]+/)
      .map(t => t.replace(/^#/, '').trim().toLowerCase())
      .filter(t => t.length > 0)
      .slice(0, 8);

    db.posts.push({
      id: 'p' + Date.now().toString(36),
      userId: session,
      image: pubState.image,
      caption: caption || 'Shared on NICE ✨',
      tags, location: loc || 'Sri Lanka',
      ts: Date.now(), likes: 0, liked: false, comments: []
    });
    Store.saveDB();

    pubState.image = null;
    toast('Posted! Your moment is live 🎉');
    location.hash = '#/home';
  }

  /* ============================================================
     VIEW: messages
     ============================================================ */

  const REPLIES = [
    'Haha nice! 😄', 'That’s awesome!', 'Wow 😍', 'Tell me more!',
    'Sounds like a plan 👌', '🔥🔥🔥', 'Looks amazing!', 'Send more photos 📷',
    'Agreed 100%', 'Let’s catch up soon!'
  ];

  let currentChatId = null;

  function totalUnread() { return db.chats.reduce((n, c) => n + (c.unread || 0), 0); }

  function renderMessages() {
    let html =
      '<header class="topbar"><span class="brand" style="letter-spacing:.12em">Chats</span></header>';
    html += db.chats.map(c => {
      const u = userById(c.userId);
      const last = c.messages[c.messages.length - 1];
      return (
        '<div class="chat-row" data-action="open-chat" data-cid="' + esc(c.id) + '">' +
          avatarHTML(u, 50) +
          '<div class="mid">' +
            '<div class="nm">' + esc(u.name) + ' ' + (u.verified ? badgeVerified() : '') + '</div>' +
            '<div class="last ' + (c.unread ? 'unread' : '') + '">' +
              (last ? (last.from === 'me' ? 'You: ' : '') + esc(last.text) : '') +
            '</div>' +
          '</div>' +
          '<div class="side">' +
            '<span class="tm">' + (last ? fmtTime(last.ts) : '') + '</span>' +
            (c.unread ? '<span class="bdg">' + c.unread + '</span>' : '') +
          '</div>' +
        '</div>'
      );
    }).join('');
    html += '<div class="empty">This is a demo — chats reply automatically 🤖</div>';
    $view.innerHTML = html;
    $view.scrollTop = 0;
  }

  function chatMessagesHTML(chat) {
    return chat.messages.map(m =>
      '<div class="bubble ' + (m.from === 'me' ? 'me' : 'them') + '">' +
        esc(m.text) + '<span class="btime">' + fmtTime(m.ts) + '</span>' +
      '</div>'
    ).join('');
  }

  function openChat(cid) {
    const chat = db.chats.find(c => c.id === cid);
    if (!chat) return;
    currentChatId = cid;
    const u = userById(chat.userId);
    chat.unread = 0;
    Store.saveDB();
    updateNavBadges();
    if (location.hash.replace('#/', '') === 'messages') renderMessages();

    $overlay.innerHTML =
      '<div class="chat-screen">' +
        '<div class="chat-top">' +
          '<button class="icon-btn" data-action="chat-back" aria-label="Back">' + icon('back') + '</button>' +
          avatarHTML(u, 40) +
          '<div><div class="nm">' + esc(u.name) + ' ' + (u.vip ? badgeVIP() : '') + '</div>' +
          '<div class="st">● online</div></div>' +
        '</div>' +
        '<div class="chat-body" id="chat-body">' + chatMessagesHTML(chat) +
          '<div class="bubble them" style="align-self:flex-start;opacity:.7;font-size:12px">This is a demo chat — replies are automatic 🤖</div>' +
        '</div>' +
        '<form class="chat-input" id="chat-form">' +
          '<input id="chat-text" type="text" placeholder="Message…" autocomplete="off" maxlength="500">' +
          '<button class="send" type="submit" aria-label="Send">' + icon('send') + '</button>' +
        '</form>' +
      '</div>';

    const body = document.getElementById('chat-body');
    body.scrollTop = body.scrollHeight;
    document.getElementById('chat-text').focus();
  }

  function closeChat() { $overlay.innerHTML = ''; }

  function scrollChat() {
    const body = document.getElementById('chat-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  function sendChatMessage() {
    const $input = document.getElementById('chat-text');
    const text = ($input.value || '').trim();
    if (!text) return;
    const chat = db.chats.find(c => c.id === currentChatId);
    if (!chat) return;

    chat.messages.push({ from: 'me', text, ts: Date.now() });
    Store.saveDB();
    $input.value = '';

    const body = document.getElementById('chat-body');
    body.innerHTML = chatMessagesHTML(chat) +
      '<div class="bubble them typing" id="typing"><i></i><i></i><i></i></div>';
    scrollChat();

    setTimeout(() => {
      chat.messages.push({ from: 'them', text: REPLIES[Math.floor(Math.random() * REPLIES.length)], ts: Date.now() });
      Store.saveDB();
      const b = document.getElementById('chat-body');
      if (b) { b.innerHTML = chatMessagesHTML(chat); scrollChat(); }
      if (location.hash.replace('#/', '') === 'messages') renderMessages();
    }, 1500);
  }

  /* ============================================================
     VIEW: profile
     ============================================================ */

  function renderProfile() {
    const u = me();
    const pf = prefs();
    const posts = myPosts();
    const following = Object.keys(db.follows).filter(k => db.follows[k]).length;

    $view.innerHTML =
      '<div class="profile-cover"></div>' +
      '<div class="profile-head">' +
        avatarHTML(Object.assign({}, u, { name: myName() }), 84, { cls: 'big' }) +
        '<div class="p-name">' + esc(myName()) + ' ' + (u.verified ? badgeVerified(17) : '') +
          (pf.vip ? badgeVIP(17) : '') + '</div>' +
        '<div class="p-handle">@' + esc(u.handle) + ' · ' + Store.prettyPhone(((db.accounts.find(a => a.userId === session) || {}).phone) || '') + '</div>' +
        '<p class="p-bio">' + esc(myBio()) + '</p>' +
        '<div class="p-stats">' +
          '<div class="st"><b>' + posts.length + '</b><span>Posts</span></div>' +
          '<div class="st"><b>' + fmtCount(u.followers || 0) + '</b><span>Followers</span></div>' +
          '<div class="st"><b>' + following + '</b><span>Following</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="vip-card ' + (pf.vip ? 'active' : '') + '">' +
        '<div class="row1">' + icon('crown') + (pf.vip ? 'NICE VIP · active' : 'NICE VIP') + '</div>' +
        '<p>' + (pf.vip
          ? 'You have VIP status: exclusive badge, HD uploads and priority feed placement.'
          : 'Unlock the exclusive badge, HD uploads and priority placement in the feed.') + '</p>' +
        '<button class="cta" data-action="vip">' + icon('sparkle') + (pf.vip ? 'Manage membership' : 'Get VIP') + '</button>' +
      '</div>' +

      '<div class="divider-label">My posts</div>' +
      (posts.length
        ? '<div class="photo-grid">' + posts.map(gridItem).join('') + '</div>'
        : '<div class="empty">No posts yet — share your first moment!<br><br>' +
          '<a href="#/publish" class="tag-chip" style="display:inline-block">＋ Create post</a></div>') +

      '<div class="divider-label">Settings</div>' +
      '<div class="settings-list">' +
        '<button class="settings-item" data-action="edit-profile">' + icon('user') + '<span class="grow">Edit profile</span>' + icon('arrowright') + '</button>' +
        '<button class="settings-item" data-action="vip">' + icon('crown') + '<span class="grow">Wallet &amp; VIP</span>' + icon('arrowright') + '</button>' +
        '<button class="settings-item" data-action="toggle-notifs">' + icon('bell') + '<span class="grow">Notifications</span>' +
          '<span class="switch ' + (pf.notifsOn ? 'on' : '') + '"></span></button>' +
        '<button class="settings-item" data-action="about">' + icon('sparkle') + '<span class="grow">About this demo</span>' + icon('arrowright') + '</button>' +
        '<button class="settings-item" data-action="reset">' + icon('sliders') + '<span class="grow">Reset demo data</span>' + icon('arrowright') + '</button>' +
        '<button class="settings-item danger" data-action="logout">' + icon('logout') + '<span class="grow">Log out</span>' + icon('arrowright') + '</button>' +
      '</div>';

    $view.scrollTop = 0;
  }

  function openEditProfile() {
    const pf = prefs();
    openModal(
      '<div class="doc">' +
        '<h3>Edit profile</h3>' +
        '<form id="profile-form">' +
          '<div class="field" style="margin-top:8px">' + icon('user') +
            '<input id="pf-name" type="text" maxlength="30" placeholder="Display name" value="' + esc(myName()) + '">' +
          '</div>' +
          '<div class="field">' + icon('sparkle') +
            '<input id="pf-bio" type="text" maxlength="80" placeholder="Bio" value="' + esc(myBio()) + '">' +
          '</div>' +
          '<button class="btn-primary" type="submit">Save changes</button>' +
        '</form>' +
      '</div>'
    );
    document.getElementById('profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('pf-name').value.trim();
      const bio = document.getElementById('pf-bio').value.trim();
      if (!name) { toast('Name can’t be empty', 'error'); return; }
      pf.profile = { name, bio };
      Store.saveDB();
      closeModal();
      toast('Profile updated ✔');
      renderProfile();
    });
  }

  function openVIP() {
    const pf = prefs();
    const plans = [
      { t: '1 Month', p: 'LKR 990' },
      { t: '3 Months', p: 'LKR 2,490', save: 'Save 16%' },
      { t: '12 Months', p: 'LKR 7,900', save: 'Save 33%' }
    ];
    let sel = 0;

    const wrap = openModal(
      '<div class="doc">' +
        '<h3>' + icon('crown') + ' NICE VIP</h3>' +
        '<div class="wallet-row"><div><b id="wallet-amt">' + fmtLKR(pf.wallet) + '</b><span>Wallet balance (demo)</span></div>' +
          '<button class="follow-btn" data-vip="recharge">' + icon('card') + ' Recharge +1,000</button></div>' +
        '<div id="plan-list">' +
          plans.map((pl, i) =>
            '<div class="plan ' + (i === 0 ? 'sel' : '') + '" data-plan="' + i + '">' +
              (pl.save ? '<span class="save-pill">' + pl.save + '</span>' : '') +
              '<div class="p-t"><span>' + pl.t + '</span><span class="p-p">' + pl.p + '</span></div>' +
              '<ul>' +
                '<li>' + icon('check') + 'Exclusive VIP badge</li>' +
                '<li>' + icon('check') + 'HD photo uploads</li>' +
                '<li>' + icon('check') + 'Priority in feed &amp; discover</li>' +
              '</ul>' +
            '</div>').join('') +
        '</div>' +
        '<button class="btn-primary" id="vip-subscribe" data-vip="subscribe">' +
          (pf.vip ? 'VIP is active — thanks for supporting!' : 'Subscribe with wallet') + '</button>' +
        '<p class="hint" style="text-align:center;margin-top:10px">Demo only — no real payments happen here.</p>' +
      '</div>'
    );

    wrap.addEventListener('click', (e) => {
      const plan = e.target.closest('[data-plan]');
      if (plan) {
        sel = Number(plan.dataset.plan);
        wrap.querySelectorAll('.plan').forEach(el => el.classList.remove('sel'));
        plan.classList.add('sel');
        return;
      }
      const act = e.target.closest('[data-vip]');
      if (!act) return;
      if (act.dataset.vip === 'recharge') {
        pf.wallet += 1000;
        Store.saveDB();
        const w = wrap.querySelector('#wallet-amt');
        if (w) w.textContent = fmtLKR(pf.wallet);
        toast('Recharged ' + fmtLKR(1000) + ' (demo) 💳');
      } else if (act.dataset.vip === 'subscribe') {
        if (!pf.vip) {
          pf.vip = true;
          Store.saveDB();
          toast('Welcome to NICE VIP, ' + myName().split(' ')[0] + '! 👑');
        } else {
          toast('VIP is already active 👑');
        }
        closeModal();
        renderProfile();
      }
    });
  }

  function openAbout() {
    openModal(
      '<div class="doc">' +
        '<h3>About this demo</h3>' +
        '<p>This is a <b>static, front-end recreation</b> of the NICE photo-sharing web app ' +
        '(nicemktlk.com), built with plain HTML, CSS and JavaScript for learning purposes.</p>' +
        '<h4>What’s inside</h4>' +
        '<p>· Login &amp; registration with demo credentials<br>' +
        '· Photo feed with likes, comments, tags &amp; stories<br>' +
        '· Discover search, publishing, chats, VIP &amp; profile</p>' +
        '<h4>Your data</h4>' +
        '<p>Everything is stored in your browser’s localStorage only. ' +
        'No servers, no tracking, no real payments. Not affiliated with the original site.</p>' +
        '<button class="btn-primary" data-close="1">Nice!</button>' +
      '</div>'
    );
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

  /* ============================================================
     post detail modal + comments
     ============================================================ */

  function commentsHTML(p) {
    const list = allComments(p);
    if (!list.length) return '<div class="empty" style="padding:18px 0">No comments yet.</div>';
    return list.map(c => {
      const cu = db.users.find(x => x.handle === c.handle) || { name: c.name, handle: c.handle };
      return (
        '<div class="comment">' + avatarHTML(cu, 36) +
          '<div class="ct"><b>' + esc(c.name) + '</b> ' + esc(c.text) +
          '<span class="tm">' + timeAgo(c.ts) + ' ago</span></div>' +
        '</div>'
      );
    }).join('');
  }

  function openPostModal(pid) {
    const p = postById(pid);
    if (!p) return;
    openModal(
      '<div>' + postCard(p) +
        '<div class="comments-list" id="cm-list">' + commentsHTML(p) + '</div>' +
        '<form class="comment-input" id="cm-form" data-pid="' + esc(p.id) + '">' +
          '<input id="cm-text" type="text" placeholder="Add a comment…" autocomplete="off" maxlength="300">' +
          '<button class="send" type="submit" aria-label="Post comment">' + icon('send') + '</button>' +
        '</form>' +
      '</div>'
    );
    const input = document.getElementById('cm-text');
    if (input) input.focus();
  }

  /* ============================================================
     stories
     ============================================================ */

  let storyCtl = null;

  function openStories(startIdx) {
    const items = storyUsers();
    if (!items.length) { toast('No stories yet'); return; }
    let i = Math.max(0, Math.min(startIdx, items.length - 1));
    let timer = null;

    function show() {
      const it = items[i];
      $overlay.innerHTML =
        '<div class="story-viewer">' +
          '<div class="sv-head">' + avatarHTML(it.user, 38) +
            '<div><div class="nm">' + esc(it.user.name) + ' ' + (it.user.vip ? badgeVIP() : '') + '</div>' +
            '<div class="tm">' + timeAgo(it.post.ts) + ' ago</div></div>' +
            '<button class="sv-close" data-action="story-close" aria-label="Close">' + icon('close') + '</button>' +
          '</div>' +
          '<div style="padding:0 14px"><div class="bar"><i></i></div></div>' +
          '<div class="sv-img-wrap"><img src="' + esc(it.post.image) + '" alt=""></div>' +
          '<p class="sv-cap">' + esc(it.post.caption) + '</p>' +
          '<div class="sv-nav prev" data-action="story-prev"></div>' +
          '<div class="sv-nav next" data-action="story-next"></div>' +
        '</div>';
      clearTimeout(timer);
      timer = setTimeout(() => next(), 5200);
    }
    function next() { i = (i + 1) % items.length; show(); }
    function prev() { i = (i - 1 + items.length) % items.length; show(); }
    function close() { clearTimeout(timer); $overlay.innerHTML = ''; storyCtl = null; }

    storyCtl = { next, prev, close };
    show();
  }

  /* ============================================================
     notifications
     ============================================================ */

  function openNotifications() {
    const NOTIF_ICON = { like: 'heart', comment: 'comment', follow: 'user' };
    openModal(
      '<div class="doc"><h3>Notifications</h3>' +
      (db.notifs.length
        ? db.notifs.map(n => {
            const u = userById(n.userId);
            return (
              '<div class="notif">' + avatarHTML(u, 40) +
                '<div class="nt"><b>' + esc(u.name) + '</b> ' + esc(n.text) +
                '<span class="tm">' + timeAgo(n.ts) + ' ago</span></div>' +
                icon(NOTIF_ICON[n.type] || 'bell') +
              '</div>'
            );
          }).join('')
        : '<div class="empty">You’re all caught up ✨</div>') +
      '</div>'
    );
    db.notifRead = true;
    Store.saveDB();
    const dot = $view.querySelector('[data-action="notifications"] .dot');
    if (dot) dot.remove();
  }

  /* ============================================================
     actions
     ============================================================ */

  function toggleLike(pid) {
    const p = postById(pid);
    if (!p) return;
    const now = !likeState(p);
    db.likes[pid] = now;
    Store.saveDB();
    document.querySelectorAll('.pa[data-action="like"][data-pid="' + pid + '"]').forEach(btn => {
      btn.classList.toggle('liked', now);
      btn.innerHTML = (now ? heartFilled() : icon('heart')) + '<span>' + fmtCount(likeCount(p)) + '</span>';
    });
    document.querySelectorAll('.gi[data-pid="' + pid + '"] .hl').forEach(hl => {
      hl.innerHTML = (now ? heartFilled('sm') : icon('heart')) + ' ' + fmtCount(likeCount(p));
    });
  }

  function toggleFollow(uid) {
    const u = userById(uid);
    if (!u || uid === session) return;
    db.follows[uid] = !db.follows[uid];
    Store.saveDB();
    const on = db.follows[uid];
    toast(on ? 'Following ' + u.name + ' ✔' : 'Unfollowed ' + u.name);
    document.querySelectorAll('.follow-btn[data-uid="' + uid + '"]').forEach(btn => {
      btn.classList.toggle('on', on);
      btn.textContent = on ? 'Following' : 'Follow';
    });
    renderSuggested();
    if (location.hash.replace('#/', '') === 'profile') renderProfile();
  }

  function doShare() {
    const url = location.origin + location.pathname + '#/home';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => toast('Link copied to clipboard 🔗'))
        .catch(() => toast('Sharing is demo-only 🙂'));
    } else {
      toast('Sharing is demo-only 🙂');
    }
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
      'This erases every change you made (posts, likes, chats, new accounts) and restores the original demo state.',
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
    discover: renderDiscover,
    publish: renderPublish,
    messages: renderMessages,
    profile: renderProfile
  };

  function currentRoute() {
    const r = location.hash.replace(/^#\/?/, '') || 'home';
    return ROUTES[r] ? r : 'home';
  }

  function render() {
    const r = currentRoute();
    closeChat();
    closeModal();
    ROUTES[r]();
    updateNavBadges();
  }

  function updateNavBadges() {
    const unread = totalUnread();
    document.querySelectorAll('#tabbar a').forEach(a => {
      a.classList.toggle('active', a.dataset.route === currentRoute());
      a.querySelectorAll('.nav-badge').forEach(b => b.remove());
    });
    const navMsg = document.getElementById('nav-messages');
    if (navMsg && unread > 0) {
      const b = document.createElement('span');
      b.className = 'nav-badge';
      b.textContent = unread;
      navMsg.appendChild(b);
    }
  }

  function setNavIcons() {
    document.getElementById('nav-home').querySelector('.nav-ic').innerHTML = icon('home');
    document.getElementById('nav-discover').querySelector('.nav-ic').innerHTML = icon('search');
    document.getElementById('nav-publish').querySelector('.publish-btn').innerHTML = icon('plus');
    document.getElementById('nav-messages').querySelector('.nav-ic').innerHTML = icon('chat');
    document.getElementById('nav-profile').querySelector('.nav-ic').innerHTML = icon('user');
  }

  /* ============================================================
     global event delegation
     ============================================================ */

  document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const act = el.dataset.action;

    switch (act) {
      case 'like': toggleLike(el.dataset.pid); break;
      case 'comments': openPostModal(el.dataset.pid); break;
      case 'share': doShare(); break;
      case 'follow': toggleFollow(el.dataset.uid); break;
      case 'tag':
        discoverQuery = '#' + el.dataset.tag;
        location.hash = '#/discover';
        if (currentRoute() === 'discover') renderDiscover();
        break;
      case 'open-post': openPostModal(el.dataset.pid); break;
      case 'notifications': openNotifications(); break;

      case 'story': openStories(Number(el.dataset.idx) || 0); break;
      case 'my-story': {
        const ml = myPosts()[0];
        if (ml) { openStories(0); } else {
          toast('Publish a photo to add it to your story ✨');
          location.hash = '#/publish';
        }
        break;
      }
      case 'story-next': if (storyCtl) storyCtl.next(); break;
      case 'story-prev': if (storyCtl) storyCtl.prev(); break;
      case 'story-close': if (storyCtl) storyCtl.close(); break;

      case 'open-chat': openChat(el.dataset.cid); break;
      case 'chat-back': closeChat(); if (currentRoute() === 'messages') renderMessages(); break;

      case 'pick':
        pubState.image = el.dataset.src;
        document.querySelectorAll('#pub-gallery .gi').forEach(g => g.classList.remove('sel'));
        el.classList.add('sel');
        renderPublishPreview();
        break;
      case 'upload': document.getElementById('file-input').click(); break;
      case 'clear-img':
        pubState.image = null;
        document.querySelectorAll('#pub-gallery .gi').forEach(g => g.classList.remove('sel'));
        renderPublishPreview();
        break;
      case 'publish': doPublish(); break;

      case 'edit-profile': openEditProfile(); break;
      case 'vip': openVIP(); break;
      case 'toggle-notifs': {
        const pf = prefs();
        pf.notifsOn = !pf.notifsOn;
        Store.saveDB();
        el.querySelector('.switch').classList.toggle('on', pf.notifsOn);
        toast('Notifications ' + (pf.notifsOn ? 'on' : 'off'));
        break;
      }
      case 'about': openAbout(); break;
      case 'reset': doReset(); break;
      case 'logout': doLogout(); break;
    }
  });

  /* comment + chat form submits (delegated) */
  document.body.addEventListener('submit', (e) => {
    if (e.target.id === 'cm-form') {
      e.preventDefault();
      const pid = e.target.dataset.pid;
      const $input = document.getElementById('cm-text');
      const text = ($input.value || '').trim();
      if (!text) return;
      if (!db.extraComments[pid]) db.extraComments[pid] = [];
      db.extraComments[pid].push({ name: myName(), handle: me().handle, text, ts: Date.now() });
      Store.saveDB();
      const p = postById(pid);
      const list = document.getElementById('cm-list');
      if (list) list.innerHTML = commentsHTML(p);
      $input.value = '';
      const body = document.getElementById('modal');
      if (body) body.scrollTop = body.scrollHeight;

      /* update comment count + preview everywhere this post appears (no full re-render) */
      const comments = allComments(p);
      const last = comments[comments.length - 1];
      document.querySelectorAll('.pa[data-action="comments"][data-pid="' + pid + '"] span')
        .forEach(sp => { sp.textContent = comments.length; });
      document.querySelectorAll('.comment-preview[data-pid="' + pid + '"]')
        .forEach(cp => { cp.innerHTML = '<b>@' + esc(last.handle) + '</b> ' + esc(last.text); });

      toast('Comment added 💬');
    }
    if (e.target.id === 'chat-form') {
      e.preventDefault();
      sendChatMessage();
    }
  });

  /* hidden file input for uploads */
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.id = 'file-input';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    downscaleImage(f, (dataURL) => {
      pubState.image = dataURL;
      document.querySelectorAll('#pub-gallery .gi').forEach(g => g.classList.remove('sel'));
      renderPublishPreview();
      toast('Photo ready — add a caption ✍️');
    });
    fileInput.value = '';
  });

  /* ============================================================
     boot
     ============================================================ */

  window.addEventListener('hashchange', render);
  setNavIcons();
  render();
})();
