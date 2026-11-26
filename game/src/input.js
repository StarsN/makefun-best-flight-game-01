// input.js — keyboard and mouse steering for Sky Courier.
// Arrows / WASD pitch and bank, W/S or Shift/Ctrl throttle, mouse steers too.
export const KEYS = {
  up: false,
  down: false,
  left: false,
  right: false,
  throttleUp: false,
  throttleDown: false,
  brake: false,
};

export const MOUSE = {
  active: false, // true once the pointer has moved over the canvas
  x: 0, // -1..1 across the canvas
  y: 0, // -1..1 down the canvas
};

const KEYMAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'throttleUp',
  ShiftRight: 'throttleUp',
  KeyE: 'throttleUp',
  ControlLeft: 'throttleDown',
  ControlRight: 'throttleDown',
  KeyQ: 'throttleDown',
  Space: 'brake',
};

export function installInput(canvas, onKey) {
  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (name) {
      KEYS[name] = true;
      e.preventDefault();
    }
    if (onKey) onKey(e.code, true);
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) KEYS[name] = false;
    if (onKey) onKey(e.code, false);
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(KEYS)) KEYS[k] = false;
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    MOUSE.active = true;
    MOUSE.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    MOUSE.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    MOUSE.active = true;
    MOUSE.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    MOUSE.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
}

// Combine keys and mouse into a control frame { pitch, roll, throttle, brake }.
// `throttle` is carried from the previous frame so W/S nudge it up and down.
export function readControls(dt, throttle) {
  let pitch = 0;
  let roll = 0;
  let keyboard = false;
  if (KEYS.up) { pitch += 1; keyboard = true; }
  if (KEYS.down) { pitch -= 1; keyboard = true; }
  if (KEYS.left) { roll -= 1; keyboard = true; }
  if (KEYS.right) { roll += 1; keyboard = true; }

  // Mouse steers when the keys are quiet: pointer left/right banks,
  // pointer up/down pitches. The effect fades near the centre.
  if (!keyboard && MOUSE.active) {
    const dead = 0.08;
    const mx = Math.abs(MOUSE.x) < dead ? 0 : MOUSE.x - Math.sign(MOUSE.x) * dead;
    const my = Math.abs(MOUSE.y) < dead ? 0 : MOUSE.y - Math.sign(MOUSE.y) * dead;
    roll += Math.max(-1, Math.min(1, mx * 1.4));
    pitch += Math.max(-1, Math.min(1, -my * 1.2));
  }

  if (KEYS.throttleUp) throttle += dt * 0.9;
  if (KEYS.throttleDown) throttle -= dt * 0.9;
  throttle = Math.max(0, Math.min(1, throttle));
  return { pitch, roll, throttle, brake: KEYS.brake };
}
