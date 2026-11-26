// audio.js — every sound in Sky Courier is synthesised with WebAudio:
// a prop-engine hum that follows the throttle, a ring chime, a touchdown
// thump and wind that rises with speed. No audio files.
let ctx = null;
let master = null;
let engineOsc = null;
let engineOsc2 = null;
let engineGain = null;
let windGain = null;
let windSrc = null;
let muted = false;
let started = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.9;
  return muted;
}

export function ensureAudio() {
  if (started) {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);

    // Engine: two detuned saws through a low-pass, pitch follows throttle.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineOsc2.frequency.value = 82;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    engineOsc2.start();

    // Wind: looped noise, gain follows airspeed.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 900;
    windFilter.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();
    started = true;
  } catch {
    ctx = null;
  }
}

export function updateEngineSound(throttle, speed, airborne) {
  if (!ctx || !engineGain) return;
  const t = ctx.currentTime;
  const base = 42 + throttle * 58 + speed * 0.35;
  engineOsc.frequency.setTargetAtTime(base, t, 0.08);
  engineOsc2.frequency.setTargetAtTime(base * 1.5 + 3, t, 0.08);
  const target = airborne || throttle > 0.05 ? 0.05 + throttle * 0.075 : 0.015;
  engineGain.gain.setTargetAtTime(target, t, 0.1);
  windGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.0016), t, 0.15);
}

function blip(freq, at, dur, type, vol) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, ctx.currentTime + at);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
  o.connect(g);
  g.connect(master);
  o.start(ctx.currentTime + at);
  o.stop(ctx.currentTime + at + dur + 0.05);
}

export function playRingChime() {
  blip(880, 0, 0.35, 'sine', 0.22);
  blip(1318, 0.07, 0.4, 'sine', 0.18);
  blip(1760, 0.14, 0.5, 'sine', 0.12);
}

export function playTouchdown() {
  if (!ctx || !master) return;
  const dur = 0.35;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  const g = ctx.createGain();
  g.gain.value = 0.5;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start();
  blip(140, 0, 0.3, 'sine', 0.3);
}

export function playCrash() {
  if (!ctx || !master) return;
  const dur = 0.7;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  const g = ctx.createGain();
  g.gain.value = 0.6;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start();
  blip(70, 0, 0.6, 'sawtooth', 0.25);
}

export function playClick() {
  blip(660, 0, 0.08, 'square', 0.08);
}
