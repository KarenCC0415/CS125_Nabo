// ── NABO PREFERENCE MODAL ──

const INTERESTS = [
  { emoji: '🎵', label: 'Concerts' },
  { emoji: '🍜', label: 'Food' },
  { emoji: '🎢', label: 'Amusement Parks' },
  { emoji: '🎨', label: 'Art & Galleries' },
  { emoji: '🏞️', label: 'Outdoors' },
  { emoji: '🎭', label: 'Theatre' },
  { emoji: '🏋️', label: 'Fitness' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '🛍️', label: 'Shopping' },
  { emoji: '🎬', label: 'Movies' },
  { emoji: '🍸', label: 'Nightlife' },
  { emoji: '📚', label: 'Books & Talks' },
  { emoji: '🏟️', label: 'Sports' },
  { emoji: '🧘', label: 'Wellness' },
];

const DISTANCES = ['< 1 mile', '5 miles', '10 miles', '25 miles', 'Any distance'];
const BUDGETS   = ['Free', '$', '$$', '$$$'];
const TIMES     = ['Morning', 'Afternoon', 'Evening', 'Late Night'];

const STORAGE_KEY = 'naboPrefs';
const TOTAL_STEPS = 4;

let currentStep = 1;
let prefs = { interests: [], distance: null, budget: null, time: null };

// ── Load cached prefs from localStorage if they exist ──
function loadCachedPrefs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function savePrefs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

// ── On page load: show modal only if no cached prefs ──
document.addEventListener('DOMContentLoaded', () => {
  const cached = loadCachedPrefs();

  if (!cached) {
    // First-time visitor — show modal after a short delay
    setTimeout(openModal, 600);
  } else {
    // Returning visitor — use cached prefs, CTA goes straight to app
    prefs = cached;
  }

  // CTA button — always intercept to open modal if no prefs yet,
  // or go straight to index.html if prefs already set
  const cta = document.querySelector('.hero-cta');
  if (cta) {
    cta.addEventListener('click', e => {
      e.preventDefault();
      const existing = loadCachedPrefs();
      if (existing) {
        window.location.href = 'index.html';
      } else {
        openModal();
      }
    });
  }
});

// ── Build modal DOM ──
function buildModal() {
  const overlay = document.createElement('div');
  overlay.id = 'naboModal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-progress">
        <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        <span class="progress-label" id="progressLabel">1 of ${TOTAL_STEPS}</span>
      </div>

      <div class="modal-steps" id="modalSteps"></div>

      <div class="modal-footer">
        <button class="modal-btn-ghost" id="modalBack">Back</button>
        <button class="modal-btn-primary" id="modalNext">Next →</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('modalBack').addEventListener('click', prevStep);
  document.getElementById('modalNext').addEventListener('click', nextStep);

  renderStep(1);
}

// ── Render each step ──
function renderStep(step) {
  const container = document.getElementById('modalSteps');
  document.getElementById('progressFill').style.width = `${(step / TOTAL_STEPS) * 100}%`;
  document.getElementById('progressLabel').textContent = `${step} of ${TOTAL_STEPS}`;
  document.getElementById('modalBack').style.visibility = step === 1 ? 'hidden' : 'visible';
  document.getElementById('modalNext').textContent = step === TOTAL_STEPS ? "Let's go 🎉" : 'Next →';

  // Animate step swap
  container.style.opacity = '0';
  container.style.transform = 'translateY(10px)';

  setTimeout(() => {
    if (step === 1) renderInterests(container);
    else if (step === 2) renderDistance(container);
    else if (step === 3) renderBudget(container);
    else if (step === 4) renderTime(container);

    container.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  }, 80);
}

function renderInterests(container) {
  container.innerHTML = `
    <div class="step-content">
      <div class="step-eyebrow">Step 1 · Interests</div>
      <h2 class="step-title">What are you into?</h2>
      <p class="step-sub">Pick as many as you like.</p>
      <div class="interest-grid">
        ${INTERESTS.map(i => `
          <button class="interest-chip ${prefs.interests.includes(i.label) ? 'selected' : ''}"
                  data-label="${i.label}">
            <span class="chip-emoji">${i.emoji}</span>
            <span class="chip-label">${i.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  container.querySelectorAll('.interest-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = btn.dataset.label;
      if (prefs.interests.includes(label)) {
        prefs.interests = prefs.interests.filter(l => l !== label);
        btn.classList.remove('selected');
      } else {
        prefs.interests.push(label);
        btn.classList.add('selected');
      }
    });
  });
}

function renderDistance(container) {
  container.innerHTML = `
    <div class="step-content">
      <div class="step-eyebrow">Step 2 · Distance</div>
      <h2 class="step-title">How far will you go?</h2>
      <p class="step-sub">Pick your travel radius.</p>
      <div class="option-row" id="distanceOptions">
        ${DISTANCES.map(d => `
          <button class="option-pill ${prefs.distance === d ? 'selected' : ''}" data-val="${d}">${d}</button>
        `).join('')}
      </div>
    </div>
  `;
  container.querySelectorAll('#distanceOptions .option-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      prefs.distance = btn.dataset.val;
      container.querySelectorAll('#distanceOptions .option-pill').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

function renderBudget(container) {
  container.innerHTML = `
    <div class="step-content">
      <div class="step-eyebrow">Step 3 · Budget</div>
      <h2 class="step-title">What's your budget?</h2>
      <p class="step-sub">We'll filter results accordingly.</p>
      <div class="option-row" id="budgetOptions">
        ${BUDGETS.map(b => `
          <button class="option-pill ${prefs.budget === b ? 'selected' : ''}" data-val="${b}">${b}</button>
        `).join('')}
      </div>
    </div>
  `;
  container.querySelectorAll('#budgetOptions .option-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      prefs.budget = btn.dataset.val;
      container.querySelectorAll('#budgetOptions .option-pill').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

function renderTime(container) {
  container.innerHTML = `
    <div class="step-content">
      <div class="step-eyebrow">Step 4 · Time</div>
      <h2 class="step-title">When do you usually go out?</h2>
      <p class="step-sub">We'll prioritize timely results.</p>
      <div class="option-row" id="timeOptions">
        ${TIMES.map(t => `
          <button class="option-pill ${prefs.time === t ? 'selected' : ''}" data-val="${t}">${t}</button>
        `).join('')}
      </div>
    </div>
  `;
  container.querySelectorAll('#timeOptions .option-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      prefs.time = btn.dataset.val;
      container.querySelectorAll('#timeOptions .option-pill').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

// ── Navigation ──
function nextStep() {
  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    renderStep(currentStep);
  } else {
    saveAndClose();
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    renderStep(currentStep);
  }
}

function saveAndClose() {
  savePrefs();
  closeModal();
  window.location.href = 'main.html';
}

function closeModal() {
  const overlay = document.getElementById('naboModal');
  if (overlay) {
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 280);
  }
}

function openModal() {
  currentStep = 1;
  prefs = { interests: [], distance: null, budget: null, time: null };
  if (!document.getElementById('naboModal')) buildModal();
}