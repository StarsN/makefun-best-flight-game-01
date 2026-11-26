// course.js — the airfield, the courier route and the scenery that never moves.
// The runway runs north (+z) from z = -150 to z = 750 at x = 0.

export const RUNWAY = {
  x: 0,
  zStart: -150,
  zEnd: 750,
  halfWidth: 13,
  headingDeg: 0, // runway 36: take off heading north
};

export const AIRFIELD = { x: 0, z: 300, name: 'Sky Courier Field' };

// The courier route: six rings over the valley, then home to the runway.
// [x, z, altitude in metres]
export const COURSE_POINTS = [
  [0, 650, 55],
  [180, 1050, 105],
  [520, 1550, 150],
  [260, 2150, 130],
  [-320, 1900, 100],
  [-620, 1150, 90],
];

export const RINGS = COURSE_POINTS.map(([x, z, y], i) => ({
  index: i,
  x,
  y,
  z,
  radius: 17,
  // Each ring faces the next waypoint so you fly straight through it.
  faceX: 0,
  faceZ: 1,
  passed: false,
}));

for (let i = 0; i < RINGS.length; i++) {
  const next = RINGS[(i + 1) % RINGS.length];
  const dx = next.x - RINGS[i].x;
  const dz = next.z - RINGS[i].z;
  const len = Math.hypot(dx, dz) || 1;
  RINGS[i].faceX = dx / len;
  RINGS[i].faceZ = dz / len;
}

export function onRunway(x, z) {
  return (
    Math.abs(x - RUNWAY.x) <= RUNWAY.halfWidth &&
    z >= RUNWAY.zStart &&
    z <= RUNWAY.zEnd
  );
}

export function runwayCentreError(x) {
  return x - RUNWAY.x;
}

// Scattered valley trees: seeded positions, drawn as billboards.
import { hash2 } from './terrain.js';

export const TREES = [];
for (let i = 0; i < 420; i++) {
  const x = (hash2(i, 101) - 0.5) * 4200;
  const z = (hash2(i, 103) - 0.5) * 4200 + 700;
  if (Math.abs(x) < 70 && z > -320 && z < 920) continue; // keep the strip clear
  const lakeDx = x + 620;
  const lakeDz = z - 1150;
  if (lakeDx * lakeDx + lakeDz * lakeDz < 260 * 260) continue; // not in the lake
  TREES.push({ x, z, s: 7 + hash2(i, 107) * 9, tone: hash2(i, 109) });
}

// A couple of hangars and a windsock beside the strip.
export const BUILDINGS = [
  { x: -42, z: 180, w: 34, d: 26, h: 12, colour: '#b8452f' },
  { x: -44, z: 232, w: 26, d: 20, h: 9, colour: '#3f6d8e' },
  { x: 44, z: 420, w: 30, d: 22, h: 10, colour: '#c8a24a' },
];

export function resetRings() {
  for (const ring of RINGS) ring.passed = false;
}
