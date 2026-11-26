// shots.js — staging for screenshots and the demo autopilot.
// ?shot=title  — title screen, plane waiting on the strip
// ?shot=ring   — mid-flight, the next ring glowing ahead
// ?shot=landing — on final approach, runway ahead, gear down low
// ?demo=1      — the autopilot flies a full courier run
// Shot states are frozen so a screenshot is the same every time.
import { PLANE, MISSION, resetFlight } from './flight.js';
import { RINGS } from './course.js';

export const SHOTS = {
  title: { name: '1-title.jpg', query: '?shot=title' },
  ring: { name: '2-ring.jpg', query: '?shot=ring' },
  landing: { name: '3-landing.jpg', query: '?shot=landing' },
};

export function parseStaging() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot') || '',
    demo: q.get('demo') === '1',
  };
}

// Put the plane into a photogenic frozen state. Returns true when a shot
// state was applied (physics stays frozen for these).
export function applyShot(shot) {
  if (shot === 'title') {
    resetFlight('courier');
    PLANE.x = 0;
    PLANE.y = 1.4;
    PLANE.z = 120;
    PLANE.throttle = 0.55;
    PLANE.speed = 0;
    MISSION.started = false;
    return true;
  }
  if (shot === 'ring') {
    resetFlight('courier');
    // Two rings already flown; ring 3 glows ahead over the lake.
    RINGS[0].passed = true;
    RINGS[1].passed = true;
    MISSION.ringsDone = 2;
    MISSION.score = 500;
    MISSION.time = 74;
    MISSION.started = true;
    PLANE.x = 400;
    PLANE.y = 145;
    PLANE.z = 1300;
    PLANE.heading = 0.45;
    PLANE.pitch = 0.02;
    PLANE.roll = -0.18;
    PLANE.speed = 52;
    PLANE.throttle = 0.72;
    PLANE.fuel = 81;
    PLANE.airborne = true;
    return true;
  }
  if (shot === 'landing') {
    resetFlight('courier');
    for (const ring of RINGS) ring.passed = true;
    MISSION.ringsDone = 6;
    MISSION.score = 1500;
    MISSION.time = 168;
    MISSION.started = true;
    PLANE.x = 4;
    PLANE.y = 42;
    PLANE.z = -420;
    PLANE.heading = 0.01;
    PLANE.pitch = -0.06;
    PLANE.roll = 0.02;
    PLANE.speed = 44;
    PLANE.throttle = 0.3;
    PLANE.fuel = 46;
    PLANE.airborne = true;
    return true;
  }
  return false;
}
