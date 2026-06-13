// js/audio.js — Web Audio API synthesized sound effects, no files

const STORAGE_KEY = 'serviz-muted';
const MASTER_VOLUME = 0.3;
const FOOTSTEP_THROTTLE_MS = 280;
const TYPING_THROTTLE_MS = 60;

let ctx = null;
let masterGain = null;
let noiseBuffer = null;
let muted = false;
let lastStepTime = 0;
let lastTypeTime = 0;
let lastStepFreq = 800;

try {
  muted = localStorage.getItem(STORAGE_KEY) === '1';
} catch (_) {}

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = MASTER_VOLUME;
  masterGain.connect(ctx.destination);
  return ctx;
}

function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const c = ensureContext();
  if (!c) return null;
  const length = Math.floor(c.sampleRate * 0.5);
  const buf = c.createBuffer(1, length, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

function noiseSource() {
  const c = ensureContext();
  const buf = getNoiseBuffer();
  if (!c || !buf) return null;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function applyEnvelope(gain, c, t0, attack, decay, peak) {
  gain.gain.cancelScheduledValues(t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (_) {}
}

export function isMuted() { return muted; }

export function playFootstep() {
  if (muted) return;
  const now = performance.now();
  if (now - lastStepTime < FOOTSTEP_THROTTLE_MS) return;
  lastStepTime = now;
  const c = ensureContext();
  const src = noiseSource();
  if (!c || !src) return;
  const t0 = c.currentTime;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  lastStepFreq = lastStepFreq === 800 ? 1100 : 800;
  filter.frequency.value = lastStepFreq;
  filter.Q.value = 1.2;
  const g = c.createGain();
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  applyEnvelope(g, c, t0, 0.005, 0.08, 0.5);
  src.start(t0);
  src.stop(t0 + 0.1);
}

export function playDoorOpen() {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t0);
  osc.frequency.exponentialRampToValueAtTime(600, t0 + 0.6);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  const g = c.createGain();
  osc.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  applyEnvelope(g, c, t0, 0.05, 0.55, 0.4);
  osc.start(t0);
  osc.stop(t0 + 0.65);
}

export function playTyping() {
  if (muted) return;
  const now = performance.now();
  if (now - lastTypeTime < TYPING_THROTTLE_MS) return;
  lastTypeTime = now;
  const c = ensureContext();
  const src = noiseSource();
  if (!c || !src) return;
  const t0 = c.currentTime;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 2;
  const g = c.createGain();
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  applyEnvelope(g, c, t0, 0.001, 0.04, 0.6);
  src.start(t0);
  src.stop(t0 + 0.06);
}

export function playPinDigit() {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1000;
  const g = c.createGain();
  osc.connect(g);
  g.connect(masterGain);
  applyEnvelope(g, c, t0, 0.005, 0.05, 0.5);
  osc.start(t0);
  osc.stop(t0 + 0.07);
}

export function playPinSuccess() {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime;
  [[880, 0], [1318, 0.12]].forEach(([freq, offset]) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = c.createGain();
    osc.connect(g);
    g.connect(masterGain);
    const start = t0 + offset;
    applyEnvelope(g, c, start, 0.005, 0.15, 0.5);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}

export function playPinError() {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime;
  [150, 145].forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = i === 0 ? 'sawtooth' : 'square';
    osc.frequency.value = freq;
    const g = c.createGain();
    osc.connect(g);
    g.connect(masterGain);
    applyEnvelope(g, c, t0, 0.005, 0.25, 0.3);
    osc.start(t0);
    osc.stop(t0 + 0.3);
  });
}

export function playLevelComplete() {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime;
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = c.createGain();
    osc.connect(g);
    g.connect(masterGain);
    const start = t0 + i * 0.09;
    applyEnvelope(g, c, start, 0.005, 0.18, 0.5);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

export function playTerminalOpen() {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, t0);
  osc.frequency.exponentialRampToValueAtTime(400, t0 + 0.15);
  const g = c.createGain();
  osc.connect(g);
  g.connect(masterGain);
  applyEnvelope(g, c, t0, 0.005, 0.15, 0.4);
  osc.start(t0);
  osc.stop(t0 + 0.18);
}

export function playTerminalClose() {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t0);
  osc.frequency.exponentialRampToValueAtTime(800, t0 + 0.15);
  const g = c.createGain();
  osc.connect(g);
  g.connect(masterGain);
  applyEnvelope(g, c, t0, 0.005, 0.15, 0.4);
  osc.start(t0);
  osc.stop(t0 + 0.18);
}
