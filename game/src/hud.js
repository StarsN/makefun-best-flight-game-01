// hud.js — the lit instruments and every screen around the flight:
// title, how-to, pause, crash and landing reports.
import { PLANE, MISSION } from './flight.js';
import { RINGS } from './course.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,14,22,0.62)';
  ctx.strokeStyle = 'rgba(120,220,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function label(ctx, text, x, y, size = 11) {
  ctx.fillStyle = '#8fb8d8';
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, size = 22, colour = '#eaf6ff') {
  ctx.fillStyle = colour;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawHud(ctx, w, h, demo) {
  const p = PLANE;
  const altFt = Math.max(0, Math.round((p.y - 0) * 3.28084));
  const spdKt = Math.round(p.speed * 1.94384);
  const hdg = ((p.heading * 180) / Math.PI % 360 + 360) % 360;

  // --- Top-left: the flight instruments, lit amber and cyan. ---
  panel(ctx, 14, 14, 250, 108);
  label(ctx, 'ALTITUDE', 28, 36);
  value(ctx, `${altFt.toLocaleString()} ft`, 28, 62);
  label(ctx, 'AIRSPEED', 148, 36);
  value(ctx, `${spdKt} kt`, 148, 62, 22, spdKt < 58 && p.airborne ? '#ffb84d' : '#eaf6ff');
  label(ctx, 'HEADING', 28, 96);
  value(ctx, `${String(Math.round(hdg)).padStart(3, '0')}°`, 28, 116, 18);
  // Compass tape.
  ctx.save();
  ctx.beginPath();
  ctx.rect(120, 84, 130, 30);
  ctx.clip();
  for (let d = -60; d <= 60; d += 10) {
    const deg = Math.round((hdg + d) / 10) * 10;
    const x = 185 + d * 1.1;
    const norm = ((deg % 360) + 360) % 360;
    ctx.strokeStyle = 'rgba(180,220,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(x, 88);
    ctx.lineTo(x, 98);
    ctx.stroke();
    // Labels only every 30 degrees, and only where they fit in the tape:
    // three-digit numbers need the room.
    if (norm % 30 === 0 && x > 134 && x < 236) {
      ctx.fillStyle = '#bfe0ff';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(norm).padStart(3, '0'), x, 111);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.moveTo(185, 84); ctx.lineTo(181, 78); ctx.lineTo(189, 78);
  ctx.closePath(); ctx.fill();

  // --- Top-right: mission, score, timer, fuel. ---
  panel(ctx, w - 264, 14, 250, 108);
  label(ctx, MISSION.mode === 'courier' ? 'COURIER RUN' : 'FREE FLIGHT', w - 250, 36);
  value(ctx, `${MISSION.score.toLocaleString()} pts`, w - 250, 62);
  label(ctx, 'TIME', w - 138, 36);
  value(ctx, fmtTime(MISSION.time), w - 138, 62, 18);
  label(ctx, 'RINGS', w - 250, 96);
  const ringsText = MISSION.mode === 'courier'
    ? `${MISSION.ringsDone} / ${RINGS.length}`
    : '—';
  value(ctx, ringsText, w - 250, 116, 18, '#ffc93c');
  // Fuel gauge.
  label(ctx, 'FUEL', w - 138, 96);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.roundRect(w - 138, 102, 110, 12, 6);
  ctx.fill();
  ctx.fillStyle = p.fuel > 25 ? '#37d67a' : '#ff5d4d';
  ctx.beginPath();
  ctx.roundRect(w - 138, 102, 110 * (p.fuel / 100), 12, 6);
  ctx.fill();

  // --- Bottom-left: artificial horizon + throttle. ---
  const cx = 74;
  const cy = h - 74;
  const r = 52;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-p.roll);
  ctx.translate(0, p.pitch * 260);
  ctx.fillStyle = '#3d7ec2';
  ctx.fillRect(-r, -r * 2, r * 2, r * 2);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, 0, r * 2, r * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, i * 16);
    ctx.lineTo(r * 0.6, i * 16);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#9fd8ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker.
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(cx - 34, cy - 2, 22, 4);
  ctx.fillRect(cx + 12, cy - 2, 22, 4);
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, 'ATTITUDE', cx - 30, cy + r + 18);

  // Throttle bar.
  const tx = 148;
  const ty = h - 126;
  label(ctx, 'THR', tx, ty - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.roundRect(tx, ty, 14, 100, 7);
  ctx.fill();
  ctx.fillStyle = '#ffc93c';
  const th = p.throttle * 100;
  ctx.beginPath();
  ctx.roundRect(tx, ty + 100 - th, 14, th, 7);
  ctx.fill();
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(p.throttle * 100)}%`, tx + 20, ty + 100 - th + 4);

  // --- Messages, centre-top. ---
  ctx.textAlign = 'center';
  const recent = MISSION.messages.slice(-3);
  recent.forEach((m, i) => {
    const age = MISSION.time - m.at;
    if (age > 5) return;
    ctx.globalAlpha = age > 4 ? 5 - age : 1;
    ctx.fillStyle = m.kind === 'warn' ? '#ffb84d' : m.kind === 'bad' ? '#ff6b5e' : '#8ff0b3';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(m.text, w / 2, 150 + i * 26);
    ctx.globalAlpha = 1;
  });

  // --- Next-ring arrow when the ring is off-screen. ---
  if (MISSION.mode === 'courier' && MISSION.ringsDone < RINGS.length && !MISSION.finished) {
    const ring = RINGS[MISSION.ringsDone];
    const dx = ring.x - p.x;
    const dz = ring.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 60) {
      const bearing = Math.atan2(dx, dz);
      const rel = bearing - p.heading;
      const ax = w / 2 + Math.sin(rel) * 190;
      const ay = h * 0.42 - Math.cos(rel) * 120;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(rel);
      ctx.fillStyle = 'rgba(255,201,60,0.9)';
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(9, 10); ctx.lineTo(-9, 10);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffc93c';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(dist)} m`, ax, ay + 30);
    }
  }

  if (demo) {
    ctx.fillStyle = 'rgba(255,201,60,0.95)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('DEMO — autopilot flying', w - 16, h - 16);
  }
}

function overlay(ctx, w, h) {
  ctx.fillStyle = 'rgba(6,12,20,0.55)';
  ctx.fillRect(0, 0, w, h);
}

function bigTitle(ctx, w, text, y, size, colour = '#ffffff') {
  ctx.fillStyle = colour;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, y);
}

export function drawTitle(ctx, w, h, mode) {
  overlay(ctx, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffc93c';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('S K Y   C O U R I E R', w / 2, h * 0.2);
  bigTitle(ctx, w, 'Sky Courier', h * 0.2 + 64, 64);
  ctx.fillStyle = '#cfe6f7';
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('A little prop plane, six glowing rings, one valley — and a runway to come home to.', w / 2, h * 0.2 + 104);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = '#eaf6ff';
  const lines = [
    '1  COURIER RUN — take off, fly all six rings in order, land on runway 36.',
    '2  FREE FLIGHT — no rings, just fly the valley and land wherever you like.',
    '',
    'Steer with ↑ ↓ ← → or W A S D — or move the mouse.',
    'Hold Shift to open the throttle, Ctrl to close it. Space brakes on the ground.',
    'Watch the fuel: empty tanks mean a glide, and the valley has no mercy.',
    'P pauses · M mutes · R restarts · Enter starts',
  ];
  lines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.42 + i * 30));
  ctx.fillStyle = mode === 'courier' ? '#ffc93c' : '#8fb8d8';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Press  1  for Courier Run      2  for Free Flight', w / 2, h * 0.42 + lines.length * 30 + 26);
  ctx.fillStyle = '#8fb8d8';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('An original game — built from scratch, no libraries, no network.', w / 2, h - 28);
}

export function drawPaused(ctx, w, h) {
  overlay(ctx, w, h);
  bigTitle(ctx, w, 'Paused', h * 0.42, 52);
  ctx.fillStyle = '#cfe6f7';
  ctx.font = '18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('P to resume · R to restart · M to mute', w / 2, h * 0.42 + 44);
}

export function drawEnd(ctx, w, h) {
  overlay(ctx, w, h);
  const p = PLANE;
  const won = p.landed;
  bigTitle(ctx, w, won ? 'Delivery Complete!' : 'Crashed', h * 0.3, 56, won ? '#8ff0b3' : '#ff6b5e');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '20px system-ui, sans-serif';
  if (won) {
    ctx.fillText(`You flew all ${MISSION.mode === 'courier' ? MISSION.ringsDone + ' rings' : 'the valley'} and brought her home.`, w / 2, h * 0.3 + 48);
    ctx.fillText(`Landing bonus +${MISSION.landingBonus.toLocaleString()} pts`, w / 2, h * 0.3 + 82);
  } else {
    ctx.fillText(p.crashReason || 'The flight is over.', w / 2, h * 0.3 + 48);
    ctx.fillText(`Rings flown: ${MISSION.ringsDone} / ${RINGS.length}`, w / 2, h * 0.3 + 82);
  }
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = '#ffc93c';
  ctx.fillText(`SCORE  ${MISSION.score.toLocaleString()}`, w / 2, h * 0.3 + 140);
  ctx.fillStyle = '#cfe6f7';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(`Flight time ${fmtTime(MISSION.time)} · Fuel left ${Math.round(p.fuel)}%`, w / 2, h * 0.3 + 176);
  ctx.fillText('Press R to fly again', w / 2, h * 0.3 + 216);
}
