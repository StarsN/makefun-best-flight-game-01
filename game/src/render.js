// render.js — the chase camera and everything it sees: sky, sun, clouds,
// the valley floor, the runway, the glowing rings and the courier plane.
import { CLOUDS, groundHeight, skyGradient, terrainColour } from './terrain.js';
import { BUILDINGS, RINGS, RUNWAY, TREES } from './course.js';
import { PLANE } from './flight.js';

const CELL = 70; // terrain grid cell, metres
const GRID = 46; // cells across (about 3.2 km of valley in view)
const FOV = 68;

function makeCamera(w, h) {
  const p = PLANE;
  const fx = Math.sin(p.heading) * Math.cos(p.pitch);
  const fy = Math.sin(p.pitch);
  const fz = Math.cos(p.heading) * Math.cos(p.pitch);
  // Chase position: behind and above the plane, eased toward level.
  const back = 15;
  const up = 5.2;
  const cx = p.x - fx * back;
  const cy = Math.max(p.y + up, groundHeight(p.x - fx * back, p.z - fz * back) + 3.5);
  const cz = p.z - fz * back;
  const tx = p.x + fx * 40;
  const ty = p.y + fy * 40 + 1.5;
  const tz = p.z + fz * 40;
  let fwdX = tx - cx;
  let fwdY = ty - cy;
  let fwdZ = tz - cz;
  const fl = Math.hypot(fwdX, fwdY, fwdZ) || 1;
  fwdX /= fl; fwdY /= fl; fwdZ /= fl;
  // Right = world-up x forward; up = forward x right (a right-handed
  // camera: looking north with up above, right is east).
  let rX = fwdZ;
  let rY = 0;
  let rZ = -fwdX;
  const rl = Math.hypot(rX, rY, rZ) || 1;
  rX /= rl; rY /= rl; rZ /= rl;
  const uX = fwdY * rZ - fwdZ * rY;
  const uY = fwdZ * rX - fwdX * rZ;
  const uZ = fwdX * rY - fwdY * rX;
  const focal = (h / 2) / Math.tan((FOV * Math.PI) / 360);
  return {
    x: cx, y: cy, z: cz,
    fwd: [fwdX, fwdY, fwdZ],
    right: [rX, rY, rZ],
    up: [uX, uY, uZ],
    focal, w, h,
  };
}

// Project a world point to screen space; null when behind the camera.
export function project(cam, x, y, z) {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const dz = z - cam.z;
  const cx = dx * cam.right[0] + dy * cam.right[1] + dz * cam.right[2];
  const cy = dx * cam.up[0] + dy * cam.up[1] + dz * cam.up[2];
  const cz = dx * cam.fwd[0] + dy * cam.fwd[1] + dz * cam.fwd[2];
  if (cz < 1.2) return null;
  const s = cam.focal / cz;
  return { x: cam.w / 2 + cx * s, y: cam.h / 2 - cy * s, d: cz, s };
}

function drawSky(ctx, cam, time) {
  const sunDir = { x: 0.55, y: 0.5, z: 0.55 };
  const sunDot = sunDir.x * cam.fwd[0] + sunDir.y * cam.fwd[1] + sunDir.z * cam.fwd[2];
  skyGradient(ctx, cam.w, cam.h, 0.9);
  // Sun disc, when it is ahead of us.
  if (sunDot > 0.05) {
    const sp = project(cam, cam.x + sunDir.x * 3000, cam.y + sunDir.y * 3000, cam.z + sunDir.z * 3000);
    if (sp) {
      const g = ctx.createRadialGradient(sp.x, sp.y, 4, sp.x, sp.y, 90);
      g.addColorStop(0, 'rgba(255,244,200,0.95)');
      g.addColorStop(0.25, 'rgba(255,226,140,0.55)');
      g.addColorStop(1, 'rgba(255,226,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sp.x - 95, sp.y - 95, 190, 190);
    }
  }
  // Clouds drift east, drawn as soft white puffs.
  for (const c of CLOUDS) {
    const cx = c.x + time * c.drift;
    const p = project(cam, cx, c.y, c.z);
    if (!p || p.d > 5200) continue;
    const r = c.s * p.s;
    if (r < 2) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - r * 0.55, p.y + r * 0.08, r * 0.6, r * 0.24, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + r * 0.55, p.y + r * 0.06, r * 0.65, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTerrain(ctx, cam) {
  // Grid anchored on the camera so it never pops as we fly.
  const gx = Math.floor(cam.x / CELL) * CELL;
  const gz = Math.floor(cam.z / CELL) * CELL;
  const half = (GRID * CELL) / 2;
  const cells = [];
  for (let iz = 0; iz < GRID; iz++) {
    for (let ix = 0; ix < GRID; ix++) {
      const x0 = gx - half + ix * CELL;
      const z0 = gz - half + iz * CELL;
      const dcx = x0 + CELL / 2 - cam.x;
      const dcz = z0 + CELL / 2 - cam.z;
      const d = dcx * dcx + dcz * dcz;
      cells.push({ x0, z0, d });
    }
  }
  cells.sort((a, b) => b.d - a.d); // far first, painter's order
  for (const c of cells) {
    const h00 = groundHeight(c.x0, c.z0);
    const h10 = groundHeight(c.x0 + CELL, c.z0);
    const h01 = groundHeight(c.x0, c.z0 + CELL);
    const h11 = groundHeight(c.x0 + CELL, c.z0 + CELL);
    const p00 = project(cam, c.x0, h00, c.z0);
    const p10 = project(cam, c.x0 + CELL, h10, c.z0);
    const p01 = project(cam, c.x0, h01, c.z0 + CELL);
    const p11 = project(cam, c.x0 + CELL, h11, c.z0 + CELL);
    if (!p00 && !p10 && !p01 && !p11) continue;
    const pts = [p00, p10, p11, p01].filter(Boolean);
    if (pts.length < 3) continue;
    ctx.fillStyle = terrainColour(c.x0 + CELL / 2, c.z0 + CELL / 2, (h00 + h11) / 2);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRunway(ctx, cam) {
  const { x, zStart, zEnd, halfWidth } = RUNWAY;
  const step = 30;
  for (let z = zStart; z < zEnd; z += step) {
    const z2 = Math.min(z + step, zEnd);
    const a = project(cam, x - halfWidth, groundHeight(x - halfWidth, z) + 0.3, z);
    const b = project(cam, x + halfWidth, groundHeight(x + halfWidth, z) + 0.3, z);
    const c = project(cam, x + halfWidth, groundHeight(x + halfWidth, z2) + 0.3, z2);
    const d = project(cam, x - halfWidth, groundHeight(x - halfWidth, z2) + 0.3, z2);
    if (!a || !b || !c || !d) continue;
    ctx.fillStyle = '#3a3f46';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath(); ctx.fill();
    // Edge lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    // Centre dashes.
    const mid = (z - zStart) % 60;
    if (mid < 30) {
      const m1 = project(cam, x, groundHeight(x, z) + 0.35, z);
      const m2 = project(cam, x, groundHeight(x, z2) + 0.35, z2);
      if (m1 && m2) {
        ctx.strokeStyle = '#f5f0dc';
        ctx.lineWidth = Math.max(1, 3 * m1.s / 10);
        ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.stroke();
      }
    }
  }
  // Threshold bars and the big "36" at the south end.
  for (const tz of [zStart + 8, zEnd - 8]) {
    const a = project(cam, x - 9, groundHeight(x - 9, tz) + 0.35, tz);
    const b = project(cam, x + 9, groundHeight(x + 9, tz) + 0.35, tz);
    if (a && b) {
      ctx.strokeStyle = '#f5f0dc';
      ctx.lineWidth = Math.max(2, 5 * a.s / 10);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
}

function drawBuildings(ctx, cam) {
  for (const b of BUILDINGS) {
    const g = groundHeight(b.x, b.z);
    const corners = [
      project(cam, b.x - b.w / 2, g, b.z - b.d / 2),
      project(cam, b.x + b.w / 2, g, b.z - b.d / 2),
      project(cam, b.x + b.w / 2, g + b.h, b.z - b.d / 2),
      project(cam, b.x - b.w / 2, g + b.h, b.z - b.d / 2),
    ];
    if (corners.some((p) => !p)) continue;
    ctx.fillStyle = b.colour;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath(); ctx.fill();
    // Roof.
    const r1 = project(cam, b.x - b.w / 2, g + b.h, b.z + b.d / 2);
    const r2 = project(cam, b.x + b.w / 2, g + b.h, b.z + b.d / 2);
    if (r1 && r2) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.moveTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.lineTo(r1.x, r1.y);
      ctx.lineTo(r2.x, r2.y);
      ctx.closePath(); ctx.fill();
    }
  }
}

function drawTrees(ctx, cam) {
  let drawn = 0;
  for (const t of TREES) {
    if (drawn > 140) break;
    const dx = t.x - cam.x;
    const dz = t.z - cam.z;
    if (dx * dx + dz * dz > 900 * 900) continue;
    const g = groundHeight(t.x, t.z);
    const base = project(cam, t.x, g, t.z);
    const top = project(cam, t.x, g + t.s, t.z);
    if (!base || !top) continue;
    const w = Math.max(1.5, Math.abs(top.y - base.y) * 0.45);
    ctx.fillStyle = t.tone > 0.5 ? '#2f5c26' : '#3a6b2e';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(base.x - w, base.y);
    ctx.lineTo(base.x + w, base.y);
    ctx.closePath(); ctx.fill();
    drawn++;
  }
}

function drawRings(ctx, cam, time, nextIndex) {
  for (const ring of RINGS) {
    const centre = project(cam, ring.x, ring.y, ring.z);
    if (!centre || centre.d > 2600) continue;
    const isNext = ring.index === nextIndex;
    const colour = ring.passed ? '#37d67a' : isNext ? '#ffc93c' : '#37c8e8';
    const pulse = isNext ? 1 + Math.sin(time * 5) * 0.12 : 1;
    const radius = ring.radius * centre.s * pulse;
    if (radius < 2) continue;
    // The ring lies in the plane facing its course direction.
    const nx = ring.faceX;
    const nz = ring.faceZ;
    const ux = -nz;
    const uz = nx;
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const px = ring.x + (Math.cos(a) * ux) * ring.radius;
      const py = ring.y + Math.sin(a) * ring.radius;
      const pz = ring.z + (Math.cos(a) * uz) * ring.radius;
      const p = project(cam, px, py, pz);
      if (p) pts.push(p);
    }
    if (pts.length < 8) continue;
    ctx.save();
    ctx.lineJoin = 'round';
    for (const [width, alpha] of [[10, 0.18], [5, 0.4], [2.5, 0.95]]) {
      ctx.strokeStyle = colour;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    // Label above the next ring.
    if (isNext) {
      ctx.fillStyle = '#ffc93c';
      ctx.font = `bold ${Math.max(12, radius * 0.16)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${ring.index + 1} — ${Math.round(centre.d)} m`, centre.x, centre.y - radius - 12);
    }
  }
}

// The courier plane, drawn in screen space at the chase position.
function drawPlane(ctx, cam, time) {
  const p = PLANE;
  const px = cam.w / 2;
  const py = cam.h * 0.62 + p.pitch * 260;
  const scale = cam.h / 800;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(p.roll * 0.85);
  ctx.scale(scale, scale);
  // Prop blur disc.
  const propR = 34;
  ctx.fillStyle = 'rgba(200,210,220,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, -6, propR, propR * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,235,240,0.5)';
  ctx.lineWidth = 2;
  const pa = time * 40;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(Math.cos(pa) * propR, -6 + Math.sin(pa) * propR * 0.92);
  ctx.moveTo(0, -6);
  ctx.lineTo(-Math.cos(pa) * propR, -6 - Math.sin(pa) * propR * 0.92);
  ctx.stroke();
  // Wings.
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath();
  ctx.moveTo(-118, 2); ctx.lineTo(118, 2); ctx.lineTo(96, 16); ctx.lineTo(-96, 16);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c98f1e';
  ctx.fillRect(-118, 2, 236, 3);
  // Tail.
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath();
  ctx.moveTo(-34, 52); ctx.lineTo(34, 52); ctx.lineTo(22, 62); ctx.lineTo(-22, 62);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b8452f';
  ctx.beginPath();
  ctx.moveTo(-8, 44); ctx.lineTo(8, 44); ctx.lineTo(14, 66); ctx.lineTo(-14, 66);
  ctx.closePath(); ctx.fill();
  // Fuselage.
  const body = ctx.createLinearGradient(-14, 0, 14, 0);
  body.addColorStop(0, '#f4f6f8');
  body.addColorStop(0.5, '#ffffff');
  body.addColorStop(1, '#c9d2da');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.quadraticCurveTo(13, -8, 12, 30);
  ctx.quadraticCurveTo(11, 58, 0, 66);
  ctx.quadraticCurveTo(-11, 58, -12, 30);
  ctx.quadraticCurveTo(-13, -8, 0, -26);
  ctx.fill();
  // Canopy.
  ctx.fillStyle = '#7fc4e8';
  ctx.beginPath();
  ctx.ellipse(0, -2, 8, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-2.5, -7, 2.5, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Navigation lights.
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath(); ctx.arc(-118, 8, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#37d67a';
  ctx.beginPath(); ctx.arc(118, 8, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(0, 66, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function renderWorld(ctx, w, h, time, nextRingIndex) {
  const cam = makeCamera(w, h);
  drawSky(ctx, cam, time);
  drawTerrain(ctx, cam);
  drawRunway(ctx, cam);
  drawBuildings(ctx, cam);
  drawTrees(ctx, cam);
  drawRings(ctx, cam, time, nextRingIndex);
  drawPlane(ctx, cam, time);
  return cam;
}

export { project as projectPoint };
