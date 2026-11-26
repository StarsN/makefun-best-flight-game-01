// terrain.js — Sky Courier's valley: deterministic value noise, the heightfield,
// sky colours and the clouds. No assets, everything is computed here.
export function hash2(ix, iz) {
  let n = (ix * 374761393 + iz * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (((n ^ (n >>> 16)) >>> 0) % 100000) / 100000;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  const u = smooth(fx);
  const v = smooth(fz);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, z) {
  return (
    valueNoise(x, z) * 0.55 +
    valueNoise(x * 2.13 + 7.3, z * 2.13 + 3.1) * 0.28 +
    valueNoise(x * 4.31 + 13.7, z * 4.31 + 9.4) * 0.17
  );
}

// How flat the ground is near the airfield (the runway strip and its apron).
function airfieldFlatness(x, z) {
  const along = z > -260 && z < 860 ? 1 : 0;
  const across = Math.max(0, 1 - Math.abs(x) / 90);
  return along * across;
}

// Distance from the ring course line, used to keep the course flyable.
function courseFlatness(x, z) {
  let best = 0;
  for (const p of COURSE_POINTS) {
    const dx = x - p[0];
    const dz = z - p[1];
    const d = Math.sqrt(dx * dx + dz * dz);
    best = Math.max(best, Math.max(0, 1 - d / 220));
  }
  return best;
}

// Ring course waypoints (x, z, altitude) — shared with course.js via import.
import { COURSE_POINTS } from './course.js';

export function groundHeight(x, z) {
  const r = Math.sqrt(x * x + z * z);
  // Rolling hills, growing into mountains far from the valley.
  const hills = (fbm(x * 0.0021, z * 0.0021) - 0.5) * 2;
  const far = Math.max(0, (r - 1800) / 1200);
  let h = hills * (26 + far * far * 160);
  // A lake basin south-west of the field.
  const lakeDx = x + 620;
  const lakeDz = z - 1150;
  const lakeD = Math.sqrt(lakeDx * lakeDx + lakeDz * lakeDz);
  if (lakeD < 260) h -= (1 - lakeD / 260) * 14;
  // Flatten the airfield and the ring course so the mission is flyable.
  const flat = Math.max(airfieldFlatness(x, z), courseFlatness(x, z) * 0.85);
  h *= 1 - flat;
  return h;
}

export function isLake(x, z) {
  const dx = x + 620;
  const dz = z - 1150;
  return dx * dx + dz * dz < 240 * 240 && groundHeight(x, z) < -2;
}

// Colour of a terrain cell from its height and slope.
export function terrainColour(x, z, h) {
  const slope = Math.abs(groundHeight(x + 24, z) - h) + Math.abs(groundHeight(x, z + 24) - h);
  const n = fbm(x * 0.011 + 40, z * 0.011 + 90);
  if (isLake(x, z)) return '#2f6fae';
  if (h > 95) return shade('#e8eef2', n); // snow caps
  if (h > 55 || slope > 14) return shade('#8a7f6a', n); // rock
  if (h < 2 && Math.abs(x) < 60 && z > -260 && z < 860) return shade('#9aa08a', n); // airfield grass
  if (n > 0.62) return shade('#4d7a3a', n); // meadow patches
  return shade('#5d8a44', n); // valley grass
}

function shade(hex, n) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 0.88 + n * 0.24;
  return `rgb(${Math.min(255, r * f) | 0},${Math.min(255, g * f) | 0},${Math.min(255, b * f) | 0})`;
}

// Clouds: fixed puffs drifting slowly over the valley.
export const CLOUDS = [];
for (let i = 0; i < 16; i++) {
  const a = hash2(i, 3) * Math.PI * 2;
  const r = 500 + hash2(i, 7) * 2600;
  CLOUDS.push({
    x: Math.cos(a) * r,
    z: Math.sin(a) * r + 600,
    y: 320 + hash2(i, 11) * 220,
    s: 90 + hash2(i, 13) * 160,
    drift: 2 + hash2(i, 17) * 4,
  });
}

export function skyGradient(ctx, w, h, sunY) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const day = Math.max(0, Math.min(1, sunY));
  g.addColorStop(0, mix('#2f6fd0', '#7fb2e8', day));
  g.addColorStop(0.55, mix('#7fb2e8', '#bcd9f2', day));
  g.addColorStop(0.78, mix('#cfe4f2', '#e8d9b0', day));
  g.addColorStop(1, '#d8c9a0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function mix(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}
