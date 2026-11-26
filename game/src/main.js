// main.js — Sky Courier: boot, game loop and the state machine.
// States: title → flying ⇄ paused → ended. Demo mode flies itself;
// ?shot= states freeze a photogenic moment for screenshots.
import { installInput, readControls, KEYS } from './input.js';
import {
  ensureAudio, updateEngineSound, toggleMute,
  playRingChime, playTouchdown, playCrash, playClick,
} from './audio.js';
import { PLANE, MISSION, resetFlight, stepFlight, autopilotControl } from './flight.js';
import { RINGS } from './course.js';
import { renderWorld } from './render.js';
import { drawHud, drawTitle, drawPaused, drawEnd } from './hud.js';
import { parseStaging, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

let state = 'title'; // title | flying | paused | ended
let mode = 'courier';
let demo = false;
let frozen = false; // shot staging: render, don't simulate
let lastTime = 0;
let time = 0;
let throttle = 0;
let lastRings = 0;
let lastLanded = false;
let lastCrashed = false;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function startGame(chosenMode) {
  mode = chosenMode;
  resetFlight(mode);
  throttle = 0;
  lastRings = 0;
  lastLanded = false;
  lastCrashed = false;
  state = 'flying';
  MISSION.started = true;
  ensureAudio();
  playClick();
  setStatus(mode === 'courier'
    ? 'Courier run started. Take off from runway 36 and fly the six rings.'
    : 'Free flight started. Fly the valley and land when you are ready.');
}

function endGame() {
  state = 'ended';
  if (PLANE.crashed) playCrash();
  else if (PLANE.landed) playTouchdown();
  setStatus(PLANE.landed
    ? `Delivery complete. Score ${MISSION.score}.`
    : `Crashed: ${PLANE.crashReason} Score ${MISSION.score}.`);
}

function onKey(code, down) {
  if (!down) return;
  ensureAudio();
  if (code === 'KeyM') {
    const muted = toggleMute();
    setStatus(muted ? 'Sound off.' : 'Sound on.');
    return;
  }
  if (state === 'title') {
    if (code === 'Digit1' || code === 'Numpad1' || code === 'Enter') startGame('courier');
    else if (code === 'Digit2' || code === 'Numpad2') startGame('free');
    return;
  }
  if (code === 'KeyP' || code === 'Escape') {
    if (state === 'flying') { state = 'paused'; setStatus('Paused.'); }
    else if (state === 'paused') { state = 'flying'; setStatus('Flying.'); }
    return;
  }
  if (code === 'KeyR' && (state === 'paused' || state === 'ended' || state === 'flying')) {
    startGame(mode);
  }
}

installInput(canvas, onKey);

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
  lastTime = now;
  time += dt;

  const w = window.innerWidth;
  const h = window.innerHeight;

  if (!frozen && state === 'flying') {
    let ctl;
    if (demo) {
      ctl = autopilotControl(dt);
      throttle = ctl.throttle;
    } else {
      ctl = readControls(dt, throttle);
      throttle = ctl.throttle;
    }
    const ringsBefore = MISSION.ringsDone;
    stepFlight(dt, ctl);
    if (MISSION.ringsDone > ringsBefore) playRingChime();
    if (PLANE.landed && !lastLanded) { lastLanded = true; endGame(); }
    if (PLANE.crashed && !lastCrashed) { lastCrashed = true; endGame(); }
    updateEngineSound(PLANE.throttle, PLANE.speed, PLANE.airborne);
  }

  // Next ring for the renderer to highlight.
  const nextRing = MISSION.mode === 'courier' && MISSION.ringsDone < RINGS.length
    ? MISSION.ringsDone
    : -1;

  renderWorld(ctx, w, h, time, nextRing);

  if (state === 'title') {
    drawTitle(ctx, w, h, mode);
  } else {
    drawHud(ctx, w, h, demo);
    if (state === 'paused') drawPaused(ctx, w, h);
    if (state === 'ended') drawEnd(ctx, w, h);
  }

  // Demo completion is visible in the end screen; expose it for tests.
  if (demo && state === 'ended') {
    window.__skyCourierResult = {
      state: PLANE.landed ? 'landed' : 'crashed',
      score: MISSION.score,
      rings: MISSION.ringsDone,
      time: MISSION.time,
      reason: PLANE.crashReason,
    };
  }
}

// --- Boot: staging first, then the loop. ---
const staging = parseStaging();
demo = staging.demo;
if (staging.shot) {
  frozen = applyShot(staging.shot);
  if (staging.shot === 'title') {
    state = 'title';
  } else {
    state = 'flying';
    MISSION.started = true;
  }
  // Shot states render with the HUD up; the render clock still moves so the
  // prop spins and the next ring pulses, but the plane never moves.
} else if (demo) {
  startGame('courier');
}
setStatus('Sky Courier — a courier flight game. Press 1 for Courier Run, 2 for Free Flight.');
requestAnimationFrame(frame);
