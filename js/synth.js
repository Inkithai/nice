/* ============================================================
   NICE (demo clone) — tiny WebAudio synth
   Each "track" is a note pattern played live in the browser:
   melody + bass + optional hi-hat noise, defined per track in
   the seed data. Fully synthesized — no audio files.
   ============================================================ */
(function () {
  'use strict';

  let ctx = null, master = null;

  const state = {
    track: null, remain: 0, total: 0, playing: false,
    onTick: null, onEnd: null,
    schedTimer: null, tickTimer: null,
    step: 0, nextT: 0
  };

  function ensureCtx() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 4500;
        master.connect(lp);
        lp.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }

  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  function tone(m, t, dur, wave, vol) {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave;
      o.frequency.value = freq(m);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (e) { /* ignore */ }
  }

  function hat(t, vol) {
    try {
      const len = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6500;
      const g = ctx.createGain();
      g.gain.value = vol;
      s.connect(hp); hp.connect(g); g.connect(master);
      s.start(t);
    } catch (e) { /* ignore */ }
  }

  /* look-ahead scheduler: keeps notes queued ~0.35s ahead */
  function schedule() {
    if (!state.playing || !ctx) return;
    const tr = state.track;
    const stepDur = 60 / tr.bpm / 2;
    while (state.nextT < ctx.currentTime + 0.35) {
      const i = state.step % tr.melody.length;
      tone(tr.melody[i], state.nextT, stepDur * 0.95, tr.wave, tr.vol || 0.12);
      if (i % 4 === 0) tone(tr.melody[i] - 24, state.nextT, stepDur * 3.8, 'sine', 0.14);
      if (tr.hat && i % 2 === 1) hat(state.nextT, 0.05);
      state.step++;
      state.nextT += stepDur;
    }
  }

  function tick() {
    if (!state.playing) return;
    state.remain = Math.max(0, state.remain - 0.25);
    if (state.onTick) state.onTick(state.remain);
    if (state.remain <= 0) finish();
  }

  function flourish() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    [72, 76, 79, 84].forEach((m, i) => tone(m, t + i * 0.09, 0.5, 'triangle', 0.14));
  }

  function stopTimers() {
    clearInterval(state.schedTimer);
    clearInterval(state.tickTimer);
    state.schedTimer = state.tickTimer = null;
  }

  function finish() {
    if (!state.track) return;
    stopTimers();
    state.playing = false;
    flourish();
    const cb = state.onEnd;
    state.track = null;
    if (cb) cb();
  }

  window.Synth = {
    get playing() { return state.playing; },
    get remain() { return state.remain; },

    /* start a track; onTick(remainingSeconds) fires 4×/s, onEnd() once */
    start(track, onTick, onEnd) {
      ensureCtx();
      this.stop();
      state.track = track;
      state.total = state.remain = track.duration;
      state.onTick = onTick;
      state.onEnd = onEnd;
      state.step = 0;
      state.playing = true;
      if (ctx) {
        state.nextT = ctx.currentTime + 0.12;
        state.schedTimer = setInterval(schedule, 90);
      }
      state.tickTimer = setInterval(tick, 250);
    },

    pause() {
      if (!state.playing) return;
      state.playing = false;
      stopTimers();
      try { if (ctx && ctx.state === 'running') ctx.suspend(); } catch (e) {}
    },

    resume() {
      if (state.playing || !state.track) return;
      ensureCtx();
      state.playing = true;
      if (ctx) {
        state.nextT = ctx.currentTime + 0.12;
        state.schedTimer = setInterval(schedule, 90);
      }
      state.tickTimer = setInterval(tick, 250);
    },

    stop() {
      stopTimers();
      state.playing = false;
      state.track = null;
    },

    /* demo helper: jump straight to the end of the current track */
    finishNow() { if (state.track) finish(); }
  };
})();
