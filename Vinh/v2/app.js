// app.js — Presentation Drill v2

// ===== Topic Categories =====
const TOPIC_CATEGORIES = {
  everyday: [
    "The best way to spend a day off in New York",
    "Why cooking at home is better than eating out",
    "How your morning routine affects your whole day",
    "The pros and cons of living in a big city",
    "Why learning to say no is an important life skill",
    "How music can change your mood instantly",
    "The benefits of reading for at least 20 minutes a day",
    "Why travelling alone is a valuable experience",
    "How to stay healthy when you have a busy schedule",
    "The importance of having a hobby outside of work"
  ],
  business: [
    "What Western companies get wrong about doing business in Southeast Asia",
    "Why the best leaders are often the most uncomfortable with certainty",
    "The case for radical transparency in corporate culture",
    "How remote work is quietly reshaping power dynamics in global firms",
    "Why most mergers and acquisitions fail to deliver promised value",
    "The art of disagreeing with your boss without damaging the relationship",
    "Why the ability to tell stories is the most underrated skill in business",
    "The difference between confidence and arrogance in professional settings",
    "Why the smartest people in the room are often the worst communicators",
    "How to make a complex idea understandable to anyone"
  ],
  finance: [
    "Why passive investing is making markets less efficient",
    "The case for — or against — cryptocurrency as a legitimate asset class",
    "How AI will reshape the role of financial analysts in the next decade",
    "Should central banks prioritise inflation control over employment?",
    "The hidden risks of over-relying on quantitative models in finance",
    "Why emerging markets are consistently undervalued by Western investors",
    "How ESG investing has become more about marketing than impact",
    "The argument for raising capital gains tax on short-term trading",
    "Will the US dollar remain the world's reserve currency in 20 years?",
    "How geopolitical risk is becoming the biggest blind spot for investors"
  ],
  "big-ideas": [
    "How Vietnam's economic rise compares to China's — and where it diverges",
    "The unintended consequences of economic sanctions on global trade",
    "Why immigration is the most misunderstood economic issue in America",
    "The pressure on immigrants to assimilate versus preserving cultural identity",
    "Why being bilingual gives you a strategic advantage in negotiations",
    "How living abroad permanently changes the way you think",
    "The difference between being successful and being fulfilled",
    "Why most career advice is wrong — and what actually matters",
    "How growing up in a developing country gives you an edge in global finance",
    "Why data alone never wins an argument — and what does"
  ]
};

// ===== Phase Definitions =====
const PHASES = [
  {
    key: "intro", label: "Introduction", color: "#7c9eff", duration: 30,
    prompt: (t) => `Introduce your topic. Tell the audience what you are going to talk about.\n\nExample: "Today I'd like to talk about ${t.toLowerCase()}. This is an interesting topic because..."`,
    transition: null, isTransition: false
  },
  {
    key: "point1", label: "Point 1", color: "#c47cff", duration: 40,
    prompt: () => "Give your FIRST point. Use a fact, example, or personal opinion to support it.",
    transition: 'Start with: "First of all..." / "To begin with..." / "The first thing I want to mention is..."',
    isTransition: false
  },
  {
    key: "trans1", label: "Transition", color: "#e0a0ff", duration: 10,
    prompt: () => "Now connect your first point to your second. Use a linking phrase to move smoothly to your next idea.",
    transition: 'Use: "In addition to this..." / "Another important point is..." / "Moving on to my second point..."',
    isTransition: true, hconnId: "hconn-1"
  },
  {
    key: "point2", label: "Point 2", color: "#ff9b5c", duration: 40,
    prompt: () => "Give your SECOND point. Support it with a fact, example, or personal opinion.",
    transition: null, isTransition: false
  },
  {
    key: "trans2", label: "Transition", color: "#ffb87a", duration: 10,
    prompt: () => "Now connect your second point to your third. Use a linking phrase to move smoothly to your final idea.",
    transition: 'Use: "Finally..." / "Last but not least..." / "The third and most important point is..."',
    isTransition: true, hconnId: "hconn-2"
  },
  {
    key: "point3", label: "Point 3", color: "#ffd55a", duration: 40,
    prompt: () => "Give your THIRD point. Make it your strongest or most interesting idea.",
    transition: null, isTransition: false
  },
  {
    key: "conclusion", label: "Conclusion", color: "#4de89a", duration: 30,
    prompt: (t) => `Wrap up your presentation. Summarise your three points and give a final thought on ${t.toLowerCase()}.`,
    transition: 'Begin with: "To summarise..." / "In conclusion..." / "To wrap up what I\'ve said..."',
    isTransition: false
  }
];

// Maps 7 phases → 5 struct-map nodes (null = transition, no node)
const PHASE_TO_NODE = [0, 1, null, 2, null, 3, 4];
const PHASE_TO_HCONN = [null, null, 'hconn-1', null, 'hconn-2', null, null];
const NODE_COLORS = ['#7c9eff', '#c47cff', '#ff9b5c', '#ffd55a', '#4de89a'];
const NODE_LABELS = ['Introduction', 'Point<br>1', 'Point<br>2', 'Point<br>3', 'Conclusion'];
const STEP_LABELS = ['Intro', 'Pt 1', '→', 'Pt 2', '→', 'Pt 3', 'End'];
const CIRCUMFERENCE = 238.76;

// ===== State =====
const state = {
  category: 'all',
  topic: '',
  phase: 0,
  timeLeft: 0,
  timer: null,
  recorder: null,
  chunks: [],
  blob: null,
  totalSeconds: 0,
  startTime: null,
  usedTopics: new Set()
};

// ===== Persistence =====
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('drillSettings'));
    if (saved && saved.durations) {
      saved.durations.forEach((d, i) => {
        if (PHASES[i] && d >= 5 && d <= 120) PHASES[i].duration = d;
      });
    }
  } catch (e) { /* ignore */ }
}

function persistSettings() {
  localStorage.setItem('drillSettings', JSON.stringify({
    durations: PHASES.map(p => p.duration)
  }));
}

// ===== DOM Helpers =====
const $ = (id) => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${sec}s`;
}

// ===== Structure Map (auto-generated) =====
function buildStructMap() {
  const container = $('structMap');
  if (!container) return;
  container.innerHTML = '';

  // Row 1: Introduction (wide)
  const row1 = document.createElement('div');
  row1.className = 'struct-row';
  row1.innerHTML = `<div class="struct-node struct-node-wide" id="snode-0"><div class="node-tick">✓</div><div class="node-label">Introduction</div></div>`;
  container.appendChild(row1);

  // Connectors down
  const conn1 = document.createElement('div');
  conn1.className = 'struct-connector';
  conn1.innerHTML = `<div class="connector-line" id="conn-0"></div><div class="connector-line" id="conn-1"></div><div class="connector-line" id="conn-2"></div>`;
  container.appendChild(conn1);

  // Row 2: Points 1-2-3 with h-connectors
  const row2 = document.createElement('div');
  row2.className = 'struct-row';
  row2.innerHTML = `
    <div class="struct-node struct-node-tall" id="snode-1"><div class="node-tick">✓</div><div class="node-label">Point<br>1</div></div>
    <div class="h-connector" id="hconn-1"><span class="h-arrow">→</span><span class="h-word">then</span></div>
    <div class="struct-node struct-node-tall" id="snode-2"><div class="node-tick">✓</div><div class="node-label">Point<br>2</div></div>
    <div class="h-connector" id="hconn-2"><span class="h-arrow">→</span><span class="h-word">also</span></div>
    <div class="struct-node struct-node-tall" id="snode-3"><div class="node-tick">✓</div><div class="node-label">Point<br>3</div></div>
  `;
  container.appendChild(row2);

  // Connectors down
  const conn2 = document.createElement('div');
  conn2.className = 'struct-connector';
  conn2.innerHTML = `<div class="connector-line" id="conn-3"></div><div class="connector-line" id="conn-4"></div><div class="connector-line" id="conn-5"></div>`;
  container.appendChild(conn2);

  // Row 3: Conclusion (wide)
  const row3 = document.createElement('div');
  row3.className = 'struct-row';
  row3.innerHTML = `<div class="struct-node struct-node-wide" id="snode-4"><div class="node-tick">✓</div><div class="node-label">Conclusion</div></div>`;
  container.appendChild(row3);
}

function buildStructurePreview() {
  const container = $('structurePreview');
  if (!container) return;
  container.innerHTML = '';
  const labels = [
    'Introduction — state your topic',
    'Point 1',
    '↳ Transition — link to next point',
    'Point 2',
    '↳ Transition — link to next point',
    'Point 3',
    'Conclusion — wrap it up'
  ];
  PHASES.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'structure-row';
    row.innerHTML = `<span class="dot" style="background:${p.color}"></span><span>${labels[i]}</span><span class="time">${p.duration}s</span>`;
    container.appendChild(row);
  });
}

// ===== Struct Map Updates =====
function updateStructMap(phase) {
  const activeNode = PHASE_TO_NODE[phase];
  const doneNodes = new Set();
  for (let p = 0; p < phase; p++) {
    const n = PHASE_TO_NODE[p];
    if (n !== null) doneNodes.add(n);
  }

  for (let i = 0; i < 5; i++) {
    const node = $('snode-' + i);
    if (!node) continue;
    node.classList.remove('active', 'done');
    node.style.borderColor = '';
    node.style.background = '';
    node.style.boxShadow = '';
    if (doneNodes.has(i)) {
      node.classList.add('done');
    } else if (i === activeNode) {
      node.classList.add('active');
      node.style.borderColor = NODE_COLORS[i];
      node.style.background = NODE_COLORS[i] + '22';
      node.style.setProperty('--active-glow', NODE_COLORS[i] + '55');
    }
  }

  // Vertical connectors
  const topLit = [phase >= 1, phase >= 3, phase >= 5];
  const botLit = [phase >= 6, phase >= 6, phase >= 6];
  [0, 1, 2].forEach(i => {
    const c = $('conn-' + i);
    if (c) c.classList.toggle('lit', topLit[i]);
  });
  [3, 4, 5].forEach((id, i) => {
    const c = $('conn-' + id);
    if (c) c.classList.toggle('lit', botLit[i]);
  });

  // Horizontal connectors
  const activeH = PHASE_TO_HCONN[phase];
  ['hconn-1', 'hconn-2'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.classList.remove('active', 'lit');
    if (id === activeH) {
      el.classList.add('active');
    } else if (
      (id === 'hconn-1' && phase >= 3) ||
      (id === 'hconn-2' && phase >= 5)
    ) {
      el.classList.add('lit');
    }
  });
}

// ===== Step Indicator =====
function updateStepIndicator(phaseIndex) {
  const container = $('stepDots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < PHASES.length; i++) {
    const dot = document.createElement('div');
    dot.className = 'step-dot';
    const c = PHASES[i].color;
    if (PHASES[i].isTransition) { dot.style.width = '6px'; dot.style.height = '6px'; }
    if (i < phaseIndex) {
      dot.classList.add('done');
      dot.style.borderColor = c;
      dot.style.background = c;
    }
    if (i === phaseIndex) {
      dot.classList.add('active');
      dot.style.borderColor = c;
      dot.style.background = c + '44';
    }
    const lbl = document.createElement('span');
    lbl.className = 'step-dot-label';
    lbl.textContent = STEP_LABELS[i];
    lbl.style.color = c;
    dot.appendChild(lbl);
    container.appendChild(dot);
  }
}

// ===== Timer Ring =====
function updateRing(remaining, total) {
  const offset = CIRCUMFERENCE * (1 - remaining / total);
  $('ringFg').style.strokeDashoffset = offset;
}

// ===== Topic Pool =====
function getTopicPool() {
  if (state.category === 'all') return Object.values(TOPIC_CATEGORIES).flat();
  return TOPIC_CATEGORIES[state.category] || [];
}

function pickRandomTopic() {
  const pool = getTopicPool();
  // Avoid repeats in same session
  const available = pool.filter(t => !state.usedTopics.has(t));
  const source = available.length > 0 ? available : pool;
  const topic = source[Math.floor(Math.random() * source.length)];
  state.usedTopics.add(topic);
  return topic;
}

// ===== Phase Runner =====
function runPhase() {
  const phase = PHASES[state.phase];
  updateStructMap(state.phase);
  updateStepIndicator(state.phase);

  // Card styling
  const card = $('phaseCard');
  card.style.borderColor = phase.color + '66';
  card.style.boxShadow = '0 0 20px ' + phase.color + '18';

  // Chip
  const chip = $('phaseChip');
  chip.textContent = phase.isTransition ? '↔ TRANSITION' : phase.label;
  chip.style.background = phase.color + '22';
  chip.style.color = phase.color;
  chip.style.border = '1px solid ' + phase.color + '44';

  $('phaseTitle').textContent = `Step ${state.phase + 1} of ${PHASES.length} — ${phase.label}`;

  const promptEl = $('phasePrompt');
  promptEl.textContent = phase.prompt(state.topic);
  promptEl.style.borderColor = phase.color;

  const hintEl = $('transitionHint');
  if (phase.transition) {
    hintEl.style.display = 'flex';
    $('transitionText').textContent = phase.transition;
  } else {
    hintEl.style.display = 'none';
  }

  $('ringFg').style.stroke = phase.color;
  $('recIndicator').classList.add('active');

  // Skip button label
  const skipBtn = $('skipBtn');
  if (state.phase >= PHASES.length - 1) {
    skipBtn.textContent = 'Finish drill ✓';
  } else {
    const nextLabel = PHASES[state.phase + 1].label;
    skipBtn.textContent = `Skip to ${nextLabel} →`;
  }

  state.timeLeft = phase.duration;
  updateRing(state.timeLeft, phase.duration);
  $('timerNum').textContent = state.timeLeft;

  // Sound
  if (phase.isTransition) { SFX.transition(); } else { SFX.phaseStart(); }

  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.timeLeft--;
    $('timerNum').textContent = state.timeLeft;
    updateRing(state.timeLeft, phase.duration);

    if (state.timeLeft === 5) SFX.warning();
    if (state.timeLeft > 0 && state.timeLeft <= 3) SFX.tick();

    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      nextPhase();
    }
  }, 1000);
}

function nextPhase() {
  state.phase++;
  if (state.phase >= PHASES.length) {
    finishDrill();
    return;
  }
  const card = $('phaseCard');
  card.style.opacity = '0';
  card.style.transform = 'translateY(6px)';
  card.style.transition = 'all 0.25s ease';
  setTimeout(() => {
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
    runPhase();
  }, 280);
}

function finishDrill() {
  clearInterval(state.timer);
  state.totalSeconds = Math.round((Date.now() - state.startTime) / 1000);
  SFX.complete();

  if (state.recorder && state.recorder.state !== 'inactive') {
    state.recorder.stop();
    state.recorder.stream.getTracks().forEach(t => t.stop());
    state.recorder.onstop = () => buildPlayback();
  } else {
    buildPlayback();
  }
}

function buildPlayback() {
  const mimeType = state.chunks[0]?.type || 'audio/webm';
  state.blob = new Blob(state.chunks, { type: mimeType });
  const url = URL.createObjectURL(state.blob);

  $('audioPlayer').src = url;
  $('playbackTopic').textContent = state.topic;
  $('statTime').textContent = formatTime(state.totalSeconds);
  $('statSections').textContent = PHASES.length;

  if (!navigator.share) $('shareBtn').style.display = 'none';
  showScreen('playback');
}

// ===== Public API (exposed on window.App) =====
const App = {
  start() {
    App.newTopic();
    showScreen('topic');
  },

  newTopic() {
    state.topic = pickRandomTopic();
    $('topicText').textContent = state.topic;
  },

  pickCategory(cat) {
    state.category = cat;
    document.querySelectorAll('.cat-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.cat === cat);
    });
  },

  async beginDrill() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.chunks = [];
      state.startTime = Date.now();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      state.recorder = new MediaRecorder(stream, { mimeType });
      state.recorder.ondataavailable = e => { if (e.data.size > 0) state.chunks.push(e.data); };
      state.recorder.start(500);

      state.phase = 0;
      buildStructMap();
      showScreen('drill');
      runPhase();
    } catch (e) {
      showScreen('drill');
      $('micBlocked').style.display = 'block';
    }
  },

  skipPhase() {
    clearInterval(state.timer);
    nextPhase();
  },

  download() {
    if (!state.blob) return;
    const ext = state.blob.type.includes('ogg') ? 'ogg' : 'webm';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(state.blob);
    a.download = `presentation-${state.topic.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    a.click();
    showToast('Downloading your recording...');
  },

  async share() {
    if (!state.blob || !navigator.share) return;
    try {
      const ext = state.blob.type.includes('ogg') ? 'ogg' : 'webm';
      const file = new File([state.blob], `presentation.${ext}`, { type: state.blob.type });
      await navigator.share({
        title: 'My Presentation Practice',
        text: `I just practised a presentation on: "${state.topic}"`,
        files: [file]
      });
    } catch (e) {
      showToast('Could not share — try downloading instead.');
    }
  },

  copyStructure() {
    const lines = PHASES.map((p, i) =>
      `${i + 1}. ${p.label} (${p.duration}s)${p.transition ? ' — ' + p.transition.split('"')[1] + '...' : ''}`
    ).join('\n');
    const text = `Presentation Practice — Teacher Lewis\nTopic: ${state.topic}\n\nStructure:\n${lines}\n\nTotal time: ${state.totalSeconds}s`;
    navigator.clipboard.writeText(text).then(() => showToast('Structure copied to clipboard!'));
  },

  reset() {
    state.blob = null;
    state.chunks = [];
    state.phase = 0;
    showScreen('start');
  },

  // Settings
  openSettings() {
    const container = $('settingsRows');
    container.innerHTML = '';
    PHASES.forEach((phase, i) => {
      const row = document.createElement('div');
      row.className = 'setting-row';
      row.innerHTML = `
        <span class="setting-dot" style="background:${phase.color}"></span>
        <span class="setting-label">${phase.label}${phase.isTransition ? '<small>Connecting phrase</small>' : ''}</span>
        <input type="number" class="setting-input" id="setting-${i}" value="${phase.duration}" min="5" max="120" oninput="App.updateTotal()">
        <span class="setting-unit">s</span>
      `;
      container.appendChild(row);
    });
    App.updateTotal();
    $('settingsOverlay').classList.add('open');
  },

  updateTotal() {
    let total = 0;
    PHASES.forEach((_, i) => {
      const input = $('setting-' + i);
      if (input) total += parseInt(input.value) || 0;
    });
    $('settingsTotal').textContent = formatTime(total);
  },

  closeSettings() {
    $('settingsOverlay').classList.remove('open');
  },

  saveSettings() {
    PHASES.forEach((phase, i) => {
      const input = $('setting-' + i);
      if (input) {
        const val = parseInt(input.value);
        if (val >= 5 && val <= 120) phase.duration = val;
      }
    });
    persistSettings();
    buildStructurePreview();
    App.closeSettings();
    showToast('Timings saved!');
  }
};

// Expose globally
window.App = App;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  buildStructurePreview();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') App.closeSettings();
});
