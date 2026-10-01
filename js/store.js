/* ============================================================
   NICE (demo clone) — data store
   All data lives in localStorage. No backend required.
   ============================================================ */
(function () {
  'use strict';

  const NS = 'nice_demo_v1';

  /* ---------- generic persistence helpers ---------- */
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(NS + ':' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(NS + ':' + key, JSON.stringify(value));
    } catch (e) {
      /* storage full — ignore in demo */
    }
  }
  function remove(key) { try { localStorage.removeItem(NS + ':' + key); } catch (e) {} }

  /* ---------- seed data ---------- */

  const ME = 'u0';

  const seedUsers = [
    {
      id: ME, name: 'Demo User', handle: 'demo', avatarImg: 'images/avatar-demo.jpg',
      bio: 'Just here for the nice moments ✌️', verified: false, vip: true,
      followers: 128, following: 3, isMe: true
    },
    { id: 'u1', name: 'Amaya Perera', handle: 'amaya', bio: 'Photographer 📷 · Colombo', verified: true,  vip: true,  followers: 12840, following: 412 },
    { id: 'u2', name: 'Kavindu Silva', handle: 'kavindu', bio: 'Eat. Post. Repeat. 🍛', verified: false, vip: false, followers: 3120,  following: 288 },
    { id: 'u3', name: 'Nadisha Fernando', handle: 'nadi', bio: 'Chasing sunsets 🌅 32/80 done', verified: false, vip: true,  followers: 8455,  following: 521 },
    { id: 'u4', name: 'Tharindu Jay', handle: 'tharindu', bio: 'Sneakers · Street · Neon', verified: false, vip: false, followers: 2044,  following: 187 },
    { id: 'u5', name: 'Sanduni R.', handle: 'sanduni', bio: 'Cat mom of two 🐱', verified: false, vip: false, followers: 987,   following: 143 },
    { id: 'u6', name: 'Ruwan M.', handle: 'ruwan', bio: 'Coffee first, everything later ☕', verified: false, vip: false, followers: 1567,  following: 96 }
  ];

  const seedPosts = [
    {
      id: 'p1', userId: 'u3', image: 'images/posts/beach.jpg',
      caption: 'Golden hour never disappoints. Swipe your stress away 🌅',
      tags: ['sunset', 'beach', 'travel'], location: 'Mirissa, Sri Lanka',
      ts: Date.now() - 2 * 3600e3, likes: 342, liked: false,
      comments: [
        { name: 'Amaya Perera', handle: 'amaya', text: 'That sky is unreal! 🔥', ts: Date.now() - 1.6 * 3600e3 },
        { name: 'Kavindu Silva', handle: 'kavindu', text: 'Adding this to my list 📝', ts: Date.now() - 1.1 * 3600e3 }
      ]
    },
    {
      id: 'p2', userId: 'u2', image: 'images/posts/food.jpg',
      caption: 'Rice & curry Saturday. No regrets, only seconds 🍛',
      tags: ['foodie', 'srilankanfood', 'dinner'], location: 'Colombo',
      ts: Date.now() - 5 * 3600e3, likes: 518, liked: false,
      comments: [
        { name: 'Ruwan M.', handle: 'ruwan', text: 'Which place is this?? 👀', ts: Date.now() - 4 * 3600e3 }
      ]
    },
    {
      id: 'p3', userId: 'u5', image: 'images/posts/cat.jpg',
      caption: 'She picked the sunny spot again ☀️🐱',
      tags: ['cat', 'pets', 'cutie'], location: 'Home',
      ts: Date.now() - 8 * 3600e3, likes: 1204, liked: true,
      comments: [
        { name: 'Nadisha Fernando', handle: 'nadi', text: 'Those eyes 😍', ts: Date.now() - 7 * 3600e3 },
        { name: 'Demo User', handle: 'demo', text: 'Queen behavior 👑', ts: Date.now() - 6.5 * 3600e3 }
      ]
    },
    {
      id: 'p4', userId: 'u3', image: 'images/posts/hike.jpg',
      caption: '5am start, 100% worth it. The hills were glowing 🌄',
      tags: ['hiking', 'ella', 'nature'], location: 'Ella, Sri Lanka',
      ts: Date.now() - 26 * 3600e3, likes: 876, liked: false,
      comments: []
    },
    {
      id: 'p5', userId: 'u4', image: 'images/posts/city.jpg',
      caption: 'City lights hit different after the rain 🌧️✨',
      tags: ['nightlife', 'city', 'neon'], location: 'Colombo 03',
      ts: Date.now() - 30 * 3600e3, likes: 441, liked: false,
      comments: [
        { name: 'Tharindu Jay', handle: 'tharindu', text: 'Shot on phone?! 😮', ts: Date.now() - 29 * 3600e3 }
      ]
    },
    {
      id: 'p6', userId: ME, image: 'images/posts/coffee.jpg',
      caption: 'Slow morning, good coffee, zero plans ☕',
      tags: ['coffee', 'morningvibes', 'workspace'], location: 'Kandy',
      ts: Date.now() - 46 * 3600e3, likes: 96, liked: false,
      comments: [
        { name: 'Ruwan M.', handle: 'ruwan', text: 'Aesthetic level: 100', ts: Date.now() - 45 * 3600e3 }
      ]
    },
    {
      id: 'p7', userId: 'u1', image: 'images/posts/fashion.jpg',
      caption: 'Autumn layers in a tropical country — I regret nothing 🧥',
      tags: ['ootd', 'streetstyle', 'fashion'], location: 'Galle Fort',
      ts: Date.now() - 52 * 3600e3, likes: 2310, liked: false,
      comments: [
        { name: 'Sanduni R.', handle: 'sanduni', text: 'Obsessed with this fit 🔥', ts: Date.now() - 50 * 3600e3 }
      ]
    },
    {
      id: 'p8', userId: ME, image: 'images/posts/temple.jpg',
      caption: 'Climbed up before sunrise. Eight wonder or not, this view is everything 🌥️',
      tags: ['sigiriya', 'sunrise', 'history'], location: 'Sigiriya',
      ts: Date.now() - 70 * 3600e3, likes: 214, liked: false,
      comments: []
    }
  ];

  const seedChats = [
    {
      id: 'c1', userId: 'u1', unread: 2,
      messages: [
        { from: 'them', text: 'Hey! Are you joining the photo walk on Saturday? 📷', ts: Date.now() - 3 * 3600e3 },
        { from: 'me', text: 'Trying to! Where are we meeting?', ts: Date.now() - 2.8 * 3600e3 },
        { from: 'them', text: 'Galle Face at 5pm. Golden hour session 😎', ts: Date.now() - 0.6 * 3600e3 },
        { from: 'them', text: 'Bring your wide lens!', ts: Date.now() - 0.5 * 3600e3 }
      ]
    },
    {
      id: 'c2', userId: 'u4', unread: 0,
      messages: [
        { from: 'them', text: 'Bro those neon shots 🔥', ts: Date.now() - 28 * 3600e3 },
        { from: 'me', text: 'Thanks! Rain helps honestly 😄', ts: Date.now() - 27 * 3600e3 },
        { from: 'them', text: 'Let\'s shoot together sometime', ts: Date.now() - 26 * 3600e3 }
      ]
    },
    {
      id: 'c3', userId: 'u6', unread: 1,
      messages: [
        { from: 'me', text: 'That café you recommended — top tier ☕', ts: Date.now() - 50 * 3600e3 },
        { from: 'them', text: 'Told you! Try their flat white next time 👌', ts: Date.now() - 8 * 3600e3 }
      ]
    }
  ];

  const seedNotifs = [
    { id: 'n1', type: 'like', userId: 'u2', text: 'liked your photo', postId: 'p6', ts: Date.now() - 1.2 * 3600e3 },
    { id: 'n2', type: 'comment', userId: 'u5', text: 'commented: “That view! 😍”', postId: 'p8', ts: Date.now() - 4 * 3600e3 },
    { id: 'n3', type: 'follow', userId: 'u1', text: 'started following you', postId: null, ts: Date.now() - 22 * 3600e3 }
  ];

  const DEMO_ACCOUNT = { phone: '0712345678', password: 'demo1234', userId: ME };
  const DEMO_VERIFY_CODE = '123456';

  /* ---------- DB ---------- */

  function freshDB() {
    return {
      seeded: true,
      accounts: [DEMO_ACCOUNT],
      users: seedUsers.slice(),
      posts: seedPosts.slice(),
      chats: seedChats.slice(),
      notifs: seedNotifs.slice(),
      notifRead: false,
      follows: { u1: true, u2: true, u5: true },
      likes: {},
      extraComments: {},
      /* per-user preferences, keyed by user id (demo account starts as VIP) */
      perUser: {
        u0: { vip: true, wallet: 1500, profile: {}, notifsOn: true }
      }
    };
  }

  let db = load('db', null);
  if (!db || !db.seeded) {
    db = freshDB();
    save('db', db);
  }

  /* ---------- session ---------- */

  function getSession() { return load('session', null); }
  function setSession(userId) { save('session', userId); }
  function clearSession() { remove('session'); }

  function getRemembered() { return load('remembered', null); }   // { phone, password }
  function setRemembered(v) { save('remembered', v); }

  /* ---------- phone helpers ---------- */

  /* Canonical Sri Lankan format: 07XXXXXXXX */
  function normalizePhone(input) {
    let d = String(input || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('94')) d = '0' + d.slice(2);
    else if (d.length === 9 && !d.startsWith('0')) d = '0' + d;
    return d;
  }
  function prettyPhone(phone) {
    const p = normalizePhone(phone);
    if (p.length !== 10) return phone;
    return p.slice(0, 3) + ' ' + p.slice(3, 6) + ' ' + p.slice(6);
  }
  function validPhone(input) {
    const p = normalizePhone(input);
    return /^07[0-9]{8}$/.test(p);
  }

  /* ---------- exports ---------- */

  window.Store = {
    NS,
    ME,
    DEMO_ACCOUNT,
    DEMO_VERIFY_CODE,
    DEMO_PASSWORD: 'demo1234',

    get db() { return db; },
    saveDB() { save('db', db); },

    reset() {
      Object.keys(localStorage)
        .filter(k => k.indexOf(NS + ':') === 0)
        .forEach(k => localStorage.removeItem(k));
    },

    getSession, setSession, clearSession,
    getRemembered, setRemembered,
    normalizePhone, prettyPhone, validPhone
  };
})();
