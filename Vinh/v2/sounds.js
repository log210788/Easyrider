// sounds.js — Web Audio API sound effects module
let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, delay = 0) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(c.currentTime + delay);
  o.stop(c.currentTime + delay + dur);
}

const SFX = {
  phaseStart() {
    tone(880, 0.15, 'sine', 0.12, 0);
    tone(1108, 0.2, 'sine', 0.10, 0.12);
  },
  transition() {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(660, c.currentTime);
    o.frequency.linearRampToValueAtTime(880, c.currentTime + 0.2);
    g.gain.setValueAtTime(0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.4);
  },
  warning() {
    tone(740, 0.1, 'square', 0.06, 0);
    tone(740, 0.1, 'square', 0.06, 0.15);
  },
  tick() {
    tone(1000, 0.06, 'sine', 0.08, 0);
  },
  complete() {
    tone(523, 0.15, 'sine', 0.12, 0);
    tone(659, 0.15, 'sine', 0.12, 0.15);
    tone(784, 0.3, 'sine', 0.14, 0.30);
  }
};
