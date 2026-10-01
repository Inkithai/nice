/* ============================================================
   NICE (demo clone) — data store
   Music listening task platform edition.
   All data lives in localStorage. No backend required.
   ============================================================ */
(function () {
  'use strict';

  const NS = 'nice_demo_v2';

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

  /* ---------- constants ---------- */

  const ME = 'u0';

  const DEMO_ACCOUNT = { phone: '0712345678', password: 'demo1234', userId: ME };
  const DEMO_VERIFY_CODE = '123456';

  /* VIP tiers: level, price (LKR/month), daily task limit, perks */
  const VIP = [
    { level: 0, name: 'Free',    price: 0,     daily: 2,  rewardMult: 1,
      perks: ['2 tasks daily', 'Standard rewards', 'Basic support'] },
    { level: 1, name: 'VIP 1',   price: 990,   daily: 6,  rewardMult: 1.2,
      perks: ['6 tasks daily', '+20% task rewards', 'Lower withdrawal fee'] },
    { level: 2, name: 'VIP 2',   price: 2490,  daily: 12, rewardMult: 1.5,
      perks: ['12 tasks daily', '+50% task rewards', '0% withdrawal fee', 'VIP 2+ track pool'] },
    { level: 3, name: 'VIP 3',   price: 7900,  daily: 20, rewardMult: 1.5,
      perks: ['20 tasks daily', '+50% task rewards', '0% withdrawal fee', 'Priority support'] },
    { level: 4, name: 'VIP 4',   price: 19900, daily: 40, rewardMult: 2,
      perks: ['40 tasks daily', 'Double rewards', '0% withdrawal fee', 'Exclusive track pool'] }
  ];

  /* ---------- seed data ---------- */

  const seedUsers = [
    { id: ME, name: 'Demo User', handle: 'demo', avatarImg: 'images/avatar-demo.jpg' }
  ];

  /* Music tracks = listening tasks. `melody` drives the built-in synth
     (WebAudio) so every "song" is generated live — no audio files needed. */
  const now = Date.now();
  const seedTracks = [
    { id: 't1', title: 'Ocean Breeze',    artist: 'Aqua Sound',        genre: 'Chill',
      cover: 'images/posts/beach.jpg',   duration: 30, reward: 35, vipMin: 0,
      bpm: 76,  wave: 'sine',     vol: 0.12, hat: false, colors: ['#0ea5e9', '#2dd4bf'],
      melody: [60, 64, 67, 72, 69, 72, 67, 64] },
    { id: 't2', title: 'Midnight Drive',  artist: 'Neon District',     genre: 'Synthwave',
      cover: 'images/posts/city.jpg',    duration: 30, reward: 45, vipMin: 1,
      bpm: 100, wave: 'sawtooth', vol: 0.08, hat: true,  colors: ['#7c3aed', '#ec4899'],
      melody: [57, 57, 64, 57, 60, 64, 69, 64] },
    { id: 't3', title: 'Temple Dawn',     artist: 'Sunrise Collective', genre: 'Ambient',
      cover: 'images/posts/temple.jpg',  duration: 30, reward: 40, vipMin: 0,
      bpm: 58,  wave: 'sine',     vol: 0.12, hat: false, colors: ['#f59e0b', '#ef4444'],
      melody: [61, 63, 66, 68, 66, 63, 61, 59] },
    { id: 't4', title: 'Tea Hills',       artist: 'Hilltop Trio',      genre: 'Folk',
      cover: 'images/posts/hike.jpg',    duration: 30, reward: 30, vipMin: 0,
      bpm: 92,  wave: 'triangle', vol: 0.12, hat: false, colors: ['#22c55e', '#84cc16'],
      melody: [55, 59, 62, 67, 71, 67, 62, 59] },
    { id: 't5', title: 'Café Lo-Fi',      artist: 'Moka Beats',        genre: 'Lo-Fi',
      cover: 'images/posts/coffee.jpg',  duration: 30, reward: 35, vipMin: 0,
      bpm: 80,  wave: 'triangle', vol: 0.12, hat: true,  colors: ['#a16207', '#78350f'],
      melody: [62, 65, 69, 65, 60, 64, 67, 64] },
    { id: 't6', title: 'Neon Pulse',      artist: 'Voltage Club',      genre: 'EDM',
      cover: 'images/posts/fashion.jpg', duration: 30, reward: 55, vipMin: 1,
      bpm: 124, wave: 'square',   vol: 0.06, hat: true,  colors: ['#ec4899', '#f43f5e'],
      melody: [64, 67, 71, 76, 71, 67, 64, 62] },
    { id: 't7', title: 'Whisker Waltz',   artist: 'Purr Machine',      genre: 'Playful',
      cover: 'images/posts/cat.jpg',     duration: 30, reward: 30, vipMin: 0,
      bpm: 114, wave: 'triangle', vol: 0.12, hat: false, colors: ['#fb923c', '#f97316'],
      melody: [60, 62, 64, 65, 67, 65, 64, 62] },
    { id: 't8', title: 'Spice Market',    artist: 'Bazaar Sessions',   genre: 'World',
      cover: 'images/posts/food.jpg',    duration: 30, reward: 40, vipMin: 2,
      bpm: 96,  wave: 'sawtooth', vol: 0.08, hat: true,  colors: ['#dc2626', '#f97316'],
      melody: [57, 58, 60, 62, 60, 58, 57, 55] }
  ];

  /* team members (referrals) */
  const seedTeam = [
    { id: 'u1', name: 'Amaya Perera',    level: 2, joinedDays: 32, today: 420, total: 12840 },
    { id: 'u2', name: 'Kavindu Silva',   level: 0, joinedDays: 18, today: 60,  total: 2140 },
    { id: 'u3', name: 'Nadisha Fernando',level: 1, joinedDays: 25, today: 180, total: 8455 },
    { id: 'u4', name: 'Tharindu Jay',    level: 0, joinedDays: 9,  today: 95,  total: 2044 },
    { id: 'u5', name: 'Sanduni R.',      level: 0, joinedDays: 5,  today: 35,  total: 987 },
    { id: 'u6', name: 'Ruwan M.',        level: 1, joinedDays: 41, today: 210, total: 15670 }
  ];

  /* earnings history (amounts: positive = credit, negative = debit) */
  const seedEarnings = [
    { type: 'bonus',     label: 'Welcome bonus',                       amount: 1000, ts: now - 3 * 864e5 },
    { type: 'vip',       label: 'VIP 1 membership · 1 month',          amount: -990, ts: now - 3 * 864e5 + 9e5 },
    { type: 'withdraw',  label: 'Withdrawal · Bank transfer',          amount: -500, ts: now - 26 * 3600e3 },
    { type: 'task',      label: 'Task reward · Café Lo-Fi',            amount: 42,   ts: now - 5 * 3600e3 },
    { type: 'commission',label: 'Team commission · Kavindu Silva',     amount: 12,   ts: now - 2 * 3600e3 }
  ];

  const seedNotices = [
    '🎧 Welcome to NICE Music — complete daily listening tasks to earn rewards!',
    '📢 Invite friends with your code and earn 8% of their task rewards',
    '⏰ Tasks reset every day at midnight — don’t leave rewards on the table',
    '👑 Upgrade VIP to unlock more daily tasks and bigger rewards'
  ];

  /* ---------- DB ---------- */

  function freshDB() {
    return {
      seeded: true,
      accounts: [DEMO_ACCOUNT],
      users: seedUsers.slice(),
      tracks: seedTracks.slice(),
      team: seedTeam.slice(),
      teamCommTotal: 1850,
      earnings: seedEarnings.slice(),
      notices: seedNotices.slice(),
      notifRead: now - 4 * 3600e3,
      inviteCode: 'NICE-DEMO',
      /* per-user state, keyed by user id */
      perUser: {
        u0: {
          vip: 1, wallet: 1500, profile: {}, notifsOn: true,
          tasksDone: { t5: now - 5 * 3600e3 },   /* 1 task already done today */
          day: new Date(now).toISOString().slice(0, 10)
        }
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

  function getRemembered() { return load('remembered', null); }   /* { phone, password } */
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
    VIP,
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
