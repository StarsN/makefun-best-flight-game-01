// flight.js — the courier plane: arcade flight model, take-off, rings, landing,
// fuel and the autopilot that flies the demo.
import { groundHeight } from './terrain.js';
import { RINGS, RUNWAY, onRunway, resetRings } from './course.js';

export const PLANE = {
  x: 0,
  y: 1.4,
  z: 120,
  heading: 0, // radians, 0 = north (+z)
  pitch: 0, // radians, positive = nose up
  roll: 0, // radians, positive = bank right
  speed: 0, // m/s
  throttle: 0, // 0..1
  verticalSpeed: 0,
  fuel: 100,
  airborne: false,
  landed: false,
  crashed: false,
  crashReason: '',
};

export const MISSION = {
  mode: 'courier', // 'courier' (rings + land) or 'free' (fly, land when you like)
  ringsDone: 0,
  score: 0,
  time: 0,
  started: false,
  finished: false,
  onFinalApproach: false, // latched once the autopilot turns onto the final
  messages: [],
  landingBonus: 0,
  bestLanding: null,
};

export function resetFlight(mode = 'courier') {
  PLANE.x = 0;
  PLANE.y = 1.4;
  PLANE.z = 120;
  PLANE.heading = 0;
  PLANE.pitch = 0;
  PLANE.roll = 0;
  PLANE.speed = 0;
  PLANE.throttle = 0;
  PLANE.verticalSpeed = 0;
  PLANE.fuel = 100;
  PLANE.airborne = false;
  PLANE.landed = false;
  PLANE.crashed = false;
  PLANE.crashReason = '';
  MISSION.mode = mode;
  MISSION.ringsDone = 0;
  MISSION.score = 0;
  MISSION.time = 0;
  MISSION.started = false;
  MISSION.finished = false;
  MISSION.onFinalApproach = false;
  MISSION.messages = [];
  MISSION.landingBonus = 0;
  MISSION.bestLanding = null;
  resetRings();
}

export function addMessage(text, kind = 'info') {
  MISSION.messages.push({ text, kind, at: MISSION.time });
  if (MISSION.messages.length > 5) MISSION.messages.shift();
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// One physics step. `ctl` is { pitch, roll, throttle, brake } in -1..1 ranges.
export function stepFlight(dt, ctl) {
  if (PLANE.crashed || PLANE.landed) return;
  const p = PLANE;
  MISSION.time += dt;

  // Throttle and fuel.
  p.throttle = clamp(ctl.throttle, 0, 1);
  const burning = p.throttle > 0.02 && p.fuel > 0;
  if (burning) p.fuel = Math.max(0, p.fuel - dt * (0.1 + p.throttle * 0.25));
  if (p.fuel <= 0 && p.throttle > 0) {
    p.throttle = 0;
    addMessage('FUEL EMPTY — gliding', 'warn');
  }

  // Speed chases what the throttle can hold; climbing costs speed.
  const climbCost = Math.max(0, p.pitch) * 26;
  const targetSpeed = 14 + p.throttle * 62 - climbCost;
  p.speed += (targetSpeed - p.speed) * Math.min(1, 0.55 * dt);
  if (p.speed < 0) p.speed = 0;

  // Attitude follows the controls with a little weight.
  const rollTarget = clamp(ctl.roll, -1, 1) * 0.85;
  const pitchTarget = clamp(ctl.pitch, -1, 1) * 0.42;
  p.roll += (rollTarget - p.roll) * Math.min(1, 5 * dt);
  p.pitch += (pitchTarget - p.pitch) * Math.min(1, 4 * dt);

  // A banked plane turns: coordinated turn, tighter at low speed. Heading is
  // measured from north (+z) toward east (+x), so a right bank (positive
  // roll) increases heading — a right turn.
  const turnRate = Math.tan(p.roll) * 9.81 / Math.max(18, p.speed);
  p.heading += turnRate * dt;

  // Vertical speed: lift from speed and pitch, sink when slow.
  const stallSink = p.speed < 30 ? (30 - p.speed) * 0.55 : 0;
  const lift = p.speed * Math.sin(p.pitch);
  p.verticalSpeed = lift - stallSink - 0.4;
  if (!p.airborne && p.speed < 34) p.verticalSpeed = 0;

  // Move.
  const fx = Math.sin(p.heading) * Math.cos(p.pitch);
  const fz = Math.cos(p.heading) * Math.cos(p.pitch);
  p.x += fx * p.speed * dt;
  p.z += fz * p.speed * dt;
  p.y += p.verticalSpeed * dt;

  // Brakes on the ground.
  if (!p.airborne && ctl.brake) p.speed = Math.max(0, p.speed - 26 * dt);

  const ground = groundHeight(p.x, p.z);
  const heightAbove = p.y - ground;

  // Liftoff.
  if (!p.airborne && p.speed >= 34 && p.pitch > 0.04) {
    p.airborne = true;
    addMessage('AIRBORNE — climb to the rings', 'good');
  }

  // Ring checks.
  if (MISSION.mode === 'courier') {
    for (const ring of RINGS) {
      if (ring.passed) continue;
      const dx = p.x - ring.x;
      const dy = p.y - ring.y;
      const dz = p.z - ring.z;
      if (dx * dx + dy * dy + dz * dz < ring.radius * ring.radius) {
        ring.passed = true;
        MISSION.ringsDone++;
        MISSION.score += 250;
        addMessage(`RING ${MISSION.ringsDone} / ${RINGS.length}  +250`, 'good');
        if (MISSION.ringsDone === RINGS.length) {
          addMessage('ALL RINGS — land on runway 36', 'good');
        }
      }
    }
  }

  // Ground contact.
  if (heightAbove <= 1.2) {
    if (onRunway(p.x, p.z) && p.airborne) {
      const soft = p.verticalSpeed > -3.2;
      const slow = p.speed < 50;
      const aligned = Math.abs(angleDelta(p.heading, 0)) < 0.35;
      if (soft && slow && aligned) {
        landPlane();
        return;
      }
      if (!soft) return crashPlane('Hard landing — you came down too fast');
      if (!slow) return crashPlane('Too fast for the runway');
      return crashPlane('Landed sideways — line up with the runway');
    }
    if (!p.airborne) {
      p.y = ground + 1.2;
      p.verticalSpeed = 0;
      if (p.speed < 0.5 && MISSION.started) {
        // Rolled to a stop off the strip.
        if (MISSION.mode === 'free') finishFreeFlight();
      }
      return;
    }
    return crashPlane('Terrain impact — the valley is unforgiving');
  }

  // Warnings — but not on the final approach: descending onto the strip
  // is the plan, not a terrain threat.
  const onFinalLeg = Math.abs(p.x) < 40 && p.z > -500 && p.z < 900;
  if (p.airborne && heightAbove < 25 && p.verticalSpeed < -1 && !onRunway(p.x, p.z) && !onFinalLeg) {
    if (MISSION.time % 1 < dt * 2) addMessage('PULL UP — terrain!', 'warn');
  }
}

function landPlane() {
  const p = PLANE;
  p.landed = true;
  p.airborne = false;
  p.y = groundHeight(p.x, p.z) + 1.2;
  const softness = clamp(1 - Math.abs(p.verticalSpeed) / 3.2, 0, 1);
  const centre = clamp(1 - Math.abs(p.x - RUNWAY.x) / RUNWAY.halfWidth, 0, 1);
  const timeBonus = Math.max(0, 600 - Math.round(MISSION.time * 2));
  const bonus = 500 + Math.round(softness * 300) + Math.round(centre * 200) + timeBonus;
  MISSION.landingBonus = bonus;
  MISSION.score += bonus;
  MISSION.finished = true;
  MISSION.bestLanding = { softness, centre, time: MISSION.time };
  addMessage(`TOUCHDOWN +${bonus} — welcome home, courier`, 'good');
}

function finishFreeFlight() {
  MISSION.finished = true;
  const bonus = 300 + Math.round(MISSION.time);
  MISSION.score += bonus;
  MISSION.landingBonus = bonus;
  addMessage(`Free flight done +${bonus}`, 'good');
}

function crashPlane(reason) {
  PLANE.crashed = true;
  PLANE.crashReason = reason;
  MISSION.finished = true;
  addMessage(reason, 'bad');
}

// --- Autopilot (demo mode): flies the whole courier run by itself. ---
// It follows legs, not points: on each leg it steers at a "carrot" a little
// way ahead of its own position projected onto the leg, so it lines up and
// flies straight through the ring instead of orbiting it (pure pursuit of a
// point locks into a circle when the target is inside the turn radius).
export function autopilotControl(dt) {
  const p = PLANE;
  const ctl = { pitch: 0, roll: 0, throttle: 0.7, brake: false };

  // Take-off roll: full throttle, hold the strip.
  if (!p.airborne && p.speed < 34) {
    return { pitch: 0.12, roll: 0, throttle: 1, brake: false };
  }

  let leg;
  if (MISSION.mode === 'courier' && MISSION.ringsDone < RINGS.length) {
    const ring = RINGS[MISSION.ringsDone];
    const prev = MISSION.ringsDone === 0
      ? { x: 0, y: 2, z: 120 }
      : RINGS[MISSION.ringsDone - 1];
    // Lookahead longer than the tightest turn radius: a carrot inside the
    // turn circle is orbited forever, one outside it is always caught.
    leg = { ax: prev.x, ay: prev.y, az: prev.z, bx: ring.x, by: ring.y, bz: ring.z, lead: 260 };
  } else if (MISSION.mode === 'courier') {
    // Home: first to the fix south of the strip, then down the final. The
    // switch is by progress along the leg, not distance to the fix: the
    // plane circles a point it cannot reach, but it always makes progress
    // along the leg, so progress is the reliable trigger. Once on the final
    // it stays there: the two legs fight if the switch can flip back.
    const prev = RINGS[RINGS.length - 1];
    const toFix = { ax: prev.x, ay: prev.y, az: prev.z, bx: 0, by: 90, bz: -700, lead: 260 };
    if (!MISSION.onFinalApproach) {
      const abx = toFix.bx - toFix.ax;
      const abz = toFix.bz - toFix.az;
      const len2 = abx * abx + abz * abz || 1;
      const tFix = clamp(((p.x - toFix.ax) * abx + (p.z - toFix.az) * abz) / len2, 0, 1);
      const fixDist = Math.hypot(p.x - 0, p.z - -700);
      if (tFix > 0.75 || fixDist < 260) MISSION.onFinalApproach = true;
    }
    leg = MISSION.onFinalApproach
      // Touchdown zone mid-runway (z = 400), not at the far end: the
      // glide slope then has room to settle before the strip runs out.
      ? { ax: 0, ay: 90, az: -700, bx: 0, by: 2, bz: 400, lead: 260 }
      : toFix;
  } else {
    // Free flight demo: a gentle circuit and back to the strip.
    leg = { ax: 0, ay: 60, az: -700, bx: 0, by: 2, bz: 750, lead: 260 };
  }

  // Carrot: a point on the leg a little ahead of where we are on it.
  const abx = leg.bx - leg.ax;
  const abz = leg.bz - leg.az;
  const len2 = abx * abx + abz * abz || 1;
  const len = Math.sqrt(len2);
  let t = ((p.x - leg.ax) * abx + (p.z - leg.az) * abz) / len2;
  t = clamp(t, 0, 1);
  const tc = clamp(t + leg.lead / len, 0, 1.06);
  const target = { x: leg.ax + abx * tc, z: leg.az + abz * tc };
  const targetAlt = leg.ay + (leg.by - leg.ay) * clamp(tc, 0, 1);

  // Past the end of the final leg the carrot sits behind the plane and
  // would turn it around: instead fly straight and level and let her settle.
  if (MISSION.onFinalApproach && t >= 1.0) {
    return { pitch: -0.05, roll: 0, throttle: 0.3, brake: false };
  }

  const desiredHeading = Math.atan2(target.x - p.x, target.z - p.z);
  const headingErr = angleDelta(desiredHeading, p.heading);
  const dist = Math.hypot(target.x - p.x, target.z - p.z);
  // Bank hard into the turn and slow down for it: a wide, fast turn orbits
  // the target forever, so the autopilot tightens up when it must turn —
  // slow and steep beats fast and wide, especially onto the final leg.
  const desiredRoll = clamp(headingErr * 3.0, -1.1, 1.1);
  ctl.roll = clamp((desiredRoll - p.roll) * 2.5, -1, 1);

  // Altitude as a climb rate, not a pitch: the plane levels off at the
  // target height instead of climbing straight through it.
  const altErr = targetAlt - p.y;
  const desiredVy = clamp(altErr * 0.4, -8, 8);
  const desiredPitch = clamp(
    Math.asin(clamp(desiredVy / Math.max(20, p.speed), -1, 1)),
    -0.25,
    0.3,
  );
  ctl.pitch = clamp((desiredPitch - p.pitch) * 3, -1, 1);

  const onFinal = MISSION.mode === 'courier' && MISSION.ringsDone >= RINGS.length;
  if (onFinal && Math.abs(p.x) < 30 && p.z > RUNWAY.zStart - 500 && p.z < RUNWAY.zEnd) {
    ctl.throttle = p.speed > 42 ? 0.25 : 0.45;
  } else if (Math.abs(headingErr) > 0.5) {
    ctl.throttle = 0.35;
  } else if (dist < 350 && !onFinal) {
    ctl.throttle = 0.5;
  } else {
    ctl.throttle = p.speed < 52 ? 0.85 : 0.6;
  }
  if (p.landed) ctl.throttle = 0;
  return ctl;
}
