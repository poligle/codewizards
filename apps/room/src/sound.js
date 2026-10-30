/* CodeWizards · sound (step 7). Chiptune made in the browser with Web Audio, after the Game Boy's four
   channels: two pulse waves (12.5, 25 and 50 % duty), one wave channel (a 32-step, 4-bit wavetable)
   and one noise channel (a 15-bit LFSR). No audio files: every effect is a few notes.
   For someone who codes for hours: short, soft effects; the music is off by default; volume and mute
   are remembered. With the tab in the background only the review bell may sound, and only if the user
   turns that on. */
(function (G) {
  'use strict';
  const CW = G.CW = G.CW || {};
  const KEY = 'cw-sound';
  const DEFAULTS = { on: true, volume: 0.35, music: false, bell: false };
  let cfg = Object.assign({}, DEFAULTS);
  try { Object.assign(cfg, JSON.parse(G.localStorage.getItem(KEY) || '{}')); } catch (e) { /* no storage */ }
  const save = () => { try { G.localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* no storage */ } };

  let ac = null, master = null, sfxBus = null, musicBus = null, waves = null, noiseBuf = null;
  const hidden = () => G.document && G.document.visibilityState === 'hidden';

  function init() {
    if (ac) return ac;
    const AC = G.AudioContext || G.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = cfg.on ? cfg.volume : 0;
    master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    // Pulse waves of the GB's three duty cycles, as periodic waves (no aliasing clicks).
    const pulse = duty => {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      return ac.createPeriodicWave(re, im);
    };
    // The wave channel's 4-bit wavetable: a soft, slightly hollow shape.
    const table = [8, 11, 13, 14, 15, 15, 14, 13, 11, 9, 8, 7, 7, 8, 9, 10, 10, 9, 8, 6, 4, 3, 2, 1, 1, 1, 2, 3, 4, 5, 6, 7];
    const wave = (() => {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) {
        let a = 0, b = 0;
        for (let i = 0; i < 32; i++) { const v = (table[i] - 7.5) / 7.5, t = (2 * Math.PI * k * i) / 32; a += v * Math.cos(t); b += v * Math.sin(t); }
        re[k] = a / 32; im[k] = b / 32;
      }
      return ac.createPeriodicWave(re, im);
    })();
    waves = { p12: pulse(0.125), p25: pulse(0.25), p50: pulse(0.5), wave };
    // Noise from a 15-bit LFSR, like the GB's fourth channel.
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let lfsr = 0x7fff;
    for (let i = 0; i < d.length; i++) {
      const bit = (lfsr ^ (lfsr >> 1)) & 1;
      lfsr = (lfsr >> 1) | (bit << 14);
      d[i] = (lfsr & 1) ? 0.6 : -0.6;
    }
    return ac;
  }

  const hz = n => 440 * Math.pow(2, (n - 69) / 12);   // MIDI note number to Hz

  // One note on a pulse or wave channel, with a short attack and a GB-like volume envelope.
  function tone(t0, note, dur, { shape = 'p25', vol = 0.18, slide = 0, bus = sfxBus } = {}) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.setPeriodicWave(waves[shape]);
    o.frequency.setValueAtTime(hz(note), t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(hz(note + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
    g.gain.setValueAtTime(vol, t0 + dur * 0.6);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g); g.connect(bus);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(t0, dur, { vol = 0.12, cutoff = 3000, bus = sfxBus } = {}) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  }

  // The effects. Short and quiet: notes in a pentatonic minor around A, the room's key.
  const SFX = {
    step: t => noise(t, 0.035, { vol: 0.05, cutoff: 1800 }),
    door: t => { noise(t, 0.22, { vol: 0.07, cutoff: 900 }); tone(t + 0.02, 45, 0.18, { shape: 'p12', vol: 0.06, slide: -3 }); },
    read: t => { [69, 72, 76].forEach((n, i) => tone(t + i * 0.06, n, 0.07, { shape: 'wave', vol: 0.12 })); },
    write: t => { tone(t, 81 + Math.floor(Math.random() * 5), 0.045, { shape: 'p12', vol: 0.07 }); },
    present: t => { [64, 67, 71, 76].forEach((n, i) => tone(t + i * 0.07, n, 0.09, { shape: 'p25', vol: 0.12 })); },
    bell: t => { tone(t, 84, 0.16, { shape: 'p50', vol: 0.14 }); tone(t + 0.16, 79, 0.3, { shape: 'p50', vol: 0.12 }); },
    error: t => { tone(t, 64, 0.12, { shape: 'p50', vol: 0.12, slide: -5 }); tone(t + 0.12, 58, 0.22, { shape: 'p50', vol: 0.12, slide: -6 }); noise(t + 0.1, 0.18, { vol: 0.05, cutoff: 1200 }); },
    celebrate: t => { [72, 76, 79, 84].forEach((n, i) => tone(t + i * 0.08, n, 0.1, { shape: 'p25', vol: 0.13 })); tone(t + 0.34, 88, 0.25, { shape: 'p12', vol: 0.09 }); },
    cast: t => { [57, 64, 69].forEach((n, i) => tone(t + i * 0.05, n, 0.08, { shape: 'wave', vol: 0.13 })); noise(t + 0.12, 0.12, { vol: 0.04, cutoff: 5000 }); },
  };
  const last = {};
  const GAP = { step: 0.3, write: 0.12, read: 0.4 };

  function play(name) {
    if (!cfg.on || !SFX[name]) return;
    if (hidden() && !(name === 'bell' && cfg.bell)) return;     // in the background, only the bell, if asked
    if (!init() || ac.state !== 'running') return;
    const t = ac.currentTime;
    if (GAP[name] && last[name] && t - last[name] < GAP[name]) return;
    last[name] = t;
    SFX[name](t + 0.01);
  }

  // The music: a slow, quiet loop on the wave channel with a soft pulse bass, off by default.
  const MELODY = [69, null, 72, 76, null, 74, 72, null, 69, null, 67, 69, null, null, 64, null];
  const BASS = [45, 45, 43, 43, 41, 41, 40, 40];
  let musicTimer = null, beat = 0;
  function tick() {
    if (!ac || !cfg.music || hidden()) return;
    const t = ac.currentTime + 0.05, step = 0.42;
    for (let i = 0; i < 4; i++, beat++) {
      const n = MELODY[beat % MELODY.length];
      if (n) tone(t + i * step, n, step * 0.9, { shape: 'wave', vol: 0.08, bus: musicBus });
      if (beat % 2 === 0) tone(t + i * step, BASS[(beat / 2) % BASS.length], step * 1.6, { shape: 'p12', vol: 0.05, bus: musicBus });
    }
  }
  function music(on) {
    if (musicTimer) { G.clearInterval(musicTimer); musicTimer = null; }
    if (on && init()) { tick(); musicTimer = G.setInterval(tick, 4 * 420); }
  }

  function apply() {
    if (master) master.gain.setTargetAtTime(cfg.on ? cfg.volume : 0, ac.currentTime, 0.05);
    music(cfg.on && cfg.music);
    save();
  }

  // Browsers only let sound start after a gesture: the first click or key wakes it.
  function wake() {
    if (!init()) return;
    if (ac.state === 'suspended') ac.resume().then(apply, () => {}); else apply();
  }
  if (G.document) {
    G.document.addEventListener('pointerdown', wake, { once: true, capture: true });
    G.document.addEventListener('keydown', wake, { once: true, capture: true });
  }

  CW.sound = {
    play,
    get settings() { return Object.assign({}, cfg); },
    set(changes) { Object.assign(cfg, changes); if (ac) apply(); else save(); },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
