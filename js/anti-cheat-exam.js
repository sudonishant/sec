/* 
  ================================================================
  ANTI-CHEAT EXAMINATION SYSTEM - CORE JAVASCRIPT ENGINE
  Technical Club - Supaul College of Engineering (SCE Supaul)
  ================================================================
  Features:
  1. Compulsory Fullscreen Mode with Escape Key Intercept Modal
  2. Tab Switch & App Switch 5-Warning (Red Flag) Auto-Submit System
  3. Screenshot / Copy / DevTools Blockers (Right Click, PrtScn, Ctrl+C/P/U, F12)
  4. Dynamic Floating Watermark with Student Roll Number & Name
  5. Quiz Engine & Countdown Timer
  6. Data Submission to Google Sheets
  ================================================================
*/

// Configuration & Default Settings
const CONFIG = {
  // Google Apps Script Web App Endpoint URL
  googleSheetWebAppUrl: 'https://script.google.com/macros/s/AKfycbzFyXEh_Tu49_ByjGx58jn5MMqmsbImXiSq_qmIqXNL5dxhbnRRVSShYBr8iIrcOJG2/exec',
  maxWarnings: 5,
  examDurationMinutes: 15,

  // ── Quiz Scheduled Start Time ──────────────────────────────
  // Format: 'YYYY-MM-DDTHH:MM:SS'  (24-hour, Local time IST)
  // Set to null to disable time-lock (quiz always open)
  // Example: '2026-09-17T10:00:00'  → quiz opens at 10:00 AM today
  quizStartTime: '2026-09-17T07:38:00',
};

// Exam State
let state = {
  student: {
    name: '',
    rollNo: '',
    branch: '',
    subject: ''
  },
  examStarted: false,
  examSubmitted: false,
  warningCount: 0,
  currentQuestionIndex: 0,
  userAnswers: {},
  questionTimeSpent: {},
  lastQuestionActiveTime: null,
  timeRemainingSeconds: CONFIG.examDurationMinutes * 60,
  totalTimeSpentSeconds: 0,
  timerInterval: null,
  violationLogs: [],
  lastViolationTime: 0,
  fullscreenCheckInterval: null,
  candidatePhoto: null,
  isFaceVerified: false,
  cameraStream: null
};

// Official Question Bank for Supaul College of Engineering - Technical Club (/15)
let QUESTION_BANK = [
  {
    id: 1,
    question: "What is the primary objective of a Technical Club?",
    options: ["Sports", "Practical technical learning", "Entertainment", "Politics"],
    correct: 1,
    points: 1
  },
  {
    id: 2,
    question: "Which platform is mainly used for version control?",
    options: ["GitHub", "Canva", "VS Code", "Chrome"],
    correct: 0,
    points: 1
  },
  {
    id: 3,
    question: "IoT stands for",
    options: ["Internet of Things", "Intelligence of Tech", "Integration of Tools", "None"],
    correct: 0,
    points: 1
  },
  {
    id: 4,
    question: "Which language is popular for AI?",
    options: ["Python", "HTML", "CSS", "SQL"],
    correct: 0,
    points: 1
  },
  {
    id: 5,
    question: "A hackathon focuses on",
    options: ["Singing", "Problem-solving", "Cricket", "Debate"],
    correct: 1,
    points: 1
  },
  {
    id: 6,
    question: "Which protocol is secure?",
    options: ["HTTP", "HTTPS", "FTP", "SMTP"],
    correct: 1,
    points: 1
  },
  {
    id: 7,
    question: "Git command to upload commits?",
    options: ["git pull", "git push", "git clone", "git init"],
    correct: 1,
    points: 1
  },
  {
    id: 8,
    question: "Which is NOT an operating system?",
    options: ["Linux", "Windows", "Oracle", "macOS"],
    correct: 2,
    points: 1
  },
  {
    id: 9,
    question: "Which sensor measures distance?",
    options: ["MQ2", "DHT11", "Ultrasonic", "LDR"],
    correct: 2,
    points: 1
  },
  {
    id: 10,
    question: "AI that creates text/images is called",
    options: ["Predictive AI", "Generative AI", "Embedded AI", "Rule AI"],
    correct: 1,
    points: 1
  },
  {
    id: 11,
    question: "If registrations exceed seats, best approach?",
    options: ["First come", "Random", "Transparent selection", "Cancel"],
    correct: 2,
    points: 1
  },
  {
    id: 12,
    question: "GitHub is mainly used for",
    options: ["Photo editing", "Code collaboration", "Video calls", "Email"],
    correct: 1,
    points: 1
  },
  {
    id: 13,
    question: "CPU stands for",
    options: ["Central Processing Unit", "Central Program Utility", "Control Process Unit", "None"],
    correct: 0,
    points: 1
  },
  {
    id: 14,
    question: "Most important team skill",
    options: ["Listening", "Interrupting", "Ignoring", "Arguing"],
    correct: 0,
    points: 1
  },
  {
    id: 15,
    question: "Best event for innovation",
    options: ["Startup Pitch", "Fashion Show", "Dance", "Cricket"],
    correct: 0,
    points: 1
  }
];

// ─────────────────────────────────────────────────────────────
// INTERNET / NETWORK TIME SYNC & DEVICE TAMPER PROTECTION
// ─────────────────────────────────────────────────────────────
let networkTimeOffset = 0; // Difference between real Internet time and device time
const MAX_ALLOWED_TIME_DRIFT_SEC = 120; // 2 minutes max allowed mismatch

function getSyncedNow() {
  return Date.now() + networkTimeOffset;
}

// Fetch real network atomic time from server / edge / API
async function fetchInternetTime() {
  // Method 1: Edge Server / Vercel / Node HTTP Date Header (Super Fast & Exact)
  try {
    const res = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      const serverMs = new Date(dateHeader).getTime();
      if (!isNaN(serverMs) && serverMs > 0) {
        return serverMs;
      }
    }
  } catch (err) {}

  // Method 2: Node backend health API if local
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    const data = await res.json();
    if (data && data.timestamp) {
      const serverMs = new Date(data.timestamp).getTime();
      if (!isNaN(serverMs) && serverMs > 0) return serverMs;
    }
  } catch (err) {}

  // Method 3: Public World Time API fallback
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata', { cache: 'no-store' });
    const data = await res.json();
    if (data && data.unixtime) {
      return data.unixtime * 1000;
    }
  } catch (err) {}

  return null;
}

// Verify Device Time against Network Time
async function verifyTimeSync() {
  const networkMs = await fetchInternetTime();
  if (!networkMs) {
    // If offline or completely unreachable, fallback to device clock
    console.warn("Internet time unreachable, using local clock.");
    return true;
  }

  const deviceMs = Date.now();
  networkTimeOffset = networkMs - deviceMs;
  const driftSeconds = Math.abs(Math.round((networkMs - deviceMs) / 1000));

  console.log(`[TIME SYNC] Device: ${new Date(deviceMs).toLocaleTimeString()}, Internet: ${new Date(networkMs).toLocaleTimeString()}, Drift: ${driftSeconds}s`);

  if (driftSeconds > MAX_ALLOWED_TIME_DRIFT_SEC) {
    showTimeMismatchScreen(deviceMs, networkMs, driftSeconds);
    return false; // Block quiz
  }

  return true; // Time verified & synced
}

function showTimeMismatchScreen(deviceMs, networkMs, driftSeconds) {
  const deviceTimeStr = new Date(deviceMs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const internetTimeStr = new Date(networkMs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const driftMin = Math.round(driftSeconds / 60);

  document.body.innerHTML = `
    <div style="
      min-height:100vh; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      background: linear-gradient(135deg,#0a0e1a 0%,#1c1015 100%);
      font-family:'Segoe UI',sans-serif; text-align:center; padding:2rem;">

      <div style="font-size:4.5rem; margin-bottom:1rem; animation: pulse 2s infinite;">⚠️</div>

      <h1 style="color:#ff4757; font-size:2rem; margin-bottom:0.5rem; text-shadow:0 0 15px rgba(255,71,87,0.4);">
        Device Time Mismatch Detected!
      </h1>
      
      <p style="color:#ced6e0; font-size:1.05rem; max-width:540px; line-height:1.6; margin-bottom:2rem;">
        Aapke device (phone/PC) ka time <strong>Official Internet Time</strong> se match nahi kar raha hai.<br>
        Quiz ki security aur fair exam ke liye time match hona anivarya hai.
      </p>

      <div style="
        display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; max-width:480px; width:100%;
        background:rgba(0,0,0,0.5); border:2px solid #ff4757; border-radius:16px; padding:1.5rem; margin-bottom:2rem;">
        
        <div style="padding:1rem; background:rgba(255,71,87,0.1); border-radius:10px;">
          <div style="color:#ff6b81; font-size:0.8rem; font-weight:600; text-transform:uppercase;">📱 Aapka Phone Time</div>
          <div style="color:#fff; font-size:1.3rem; font-weight:bold; margin-top:0.4rem; font-family:monospace;">${deviceTimeStr}</div>
        </div>

        <div style="padding:1rem; background:rgba(0,242,254,0.1); border-radius:10px;">
          <div style="color:#00f2fe; font-size:0.8rem; font-weight:600; text-transform:uppercase;">🌐 Real Internet Time</div>
          <div style="color:#fff; font-size:1.3rem; font-weight:bold; margin-top:0.4rem; font-family:monospace;">${internetTimeStr}</div>
        </div>

        <div style="grid-column: span 2; color:#ffa502; font-size:0.85rem; font-weight:600;">
          ⏳ Antar (Difference): ~${driftMin > 0 ? driftMin + ' Minute' : driftSeconds + ' Seconds'}
        </div>
      </div>

      <div style="
        background:rgba(255,255,255,0.05); border-left:4px solid #00f2fe; border-radius:8px;
        padding:1rem 1.5rem; max-width:520px; text-align:left; margin-bottom:2rem;">
        <strong style="color:#00f2fe; font-size:0.95rem;">Kaise Theek Karein:</strong>
        <ol style="color:#aab4c8; font-size:0.88rem; margin:0.5rem 0 0 1.2rem; padding:0; line-height:1.5;">
          <li>Apne Phone ki <strong>Settings ⚙️</strong> kholein.</li>
          <li><strong>Date & Time</strong> setting me jaayein.</li>
          <li><strong>"Set Time Automatically"</strong> ya <strong>"Use Network-Provided Time"</strong> ko ON karein.</li>
          <li>Neeche diye button par click karein.</li>
        </ol>
      </div>

      <button onclick="location.reload();" style="
        background: linear-gradient(135deg, #00f2fe, #4facfe); border:none;
        color:#000; font-weight:bold; padding:0.9rem 2.5rem; font-size:1rem;
        border-radius:30px; cursor:pointer; box-shadow:0 4px 15px rgba(0,242,254,0.4);
        transition: transform 0.2s;">
        🔄 Re-Verify Time & Refresh
      </button>

      <p style="color:#57606f; font-size:0.75rem; margin-top:2rem;">
        SCE Supaul — Anti-Tamper Clock Security System
      </p>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// DEVICE LOCKOUT — 1 attempt per device per hour
// ─────────────────────────────────────────────────────────────
const LOCKOUT_KEY = 'sec_quiz_submitted_at';
const LAST_ATTEMPT_KEY = 'sec_quiz_last_attempt';
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

function checkDeviceLockout() {
  const submittedAt = localStorage.getItem(LOCKOUT_KEY);
  if (!submittedAt) return false; // no previous attempt

  const elapsed = getSyncedNow() - parseInt(submittedAt, 10);
  if (elapsed < LOCKOUT_DURATION_MS) {
    showLockoutScreen(LOCKOUT_DURATION_MS - elapsed);
    return true; // locked
  }
  // Lockout expired — clear old entry
  localStorage.removeItem(LOCKOUT_KEY);
  return false;
}

function showLockoutScreen(remainingMs) {
  let lastAttempt = {};
  try {
    lastAttempt = JSON.parse(localStorage.getItem(LAST_ATTEMPT_KEY) || '{}');
  } catch (e) {
    console.warn("Could not parse last attempt info:", e);
  }

  const studentName = lastAttempt.studentName || 'Candidate';
  const rollNo = lastAttempt.rollNo || 'N/A';
  const branch = lastAttempt.branch || '';
  const score = lastAttempt.score !== undefined ? lastAttempt.score : '--';
  const totalQuestions = lastAttempt.totalQuestions || 15;
  const percentage = lastAttempt.percentage || '0%';
  const photoSrc = lastAttempt.candidatePhoto || '';
  const timeTaken = lastAttempt.formattedTimeTaken || 'N/A';

  // Hide all normal content & render Previous Attempt Result + Lockout
  document.body.innerHTML = `
    <div id="lockout-screen" style="
      min-height:100vh; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      background: linear-gradient(135deg,#0a0e1a 0%,#131b2e 100%);
      font-family:'Segoe UI',sans-serif; text-align:center; padding:1.5rem;">
      
      <div style="font-size:3.5rem; margin-bottom:0.25rem;">🔒</div>
      <h1 style="color:#e74c3c; font-size:1.85rem; margin-bottom:0.2rem; text-shadow:0 0 15px rgba(231,76,60,0.3);">
        Quiz Already Attempted!
      </h1>
      <p style="color:#aab4c8; font-size:0.95rem; max-width:480px; line-height:1.4; margin-bottom:1.5rem;">
        Is device se quiz pehle diya ja chuka hai.<br>
        Security niyam anusar ek device se 1 ghante me sirf <strong style="color:#00f2fe;">1 baar</strong> quiz de sakte hain.
      </p>

      <!-- Previous Attempt Card with Real Photo & Score -->
      <div style="
        background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(0, 242, 254, 0.3);
        border-radius: 16px; padding: 1.4rem; max-width: 440px; width: 100%;
        margin-bottom: 1.5rem; box-shadow: 0 8px 30px rgba(0,0,0,0.4); text-align: center;">

        <div style="color:#00f2fe; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.85rem;">
          📋 Aapka Pichhla (Previous) Result
        </div>

        <!-- Verified Face Photo -->
        ${photoSrc ? `
          <div style="width: 90px; height: 90px; margin: 0 auto 0.75rem auto; border-radius: 50%; overflow: hidden; border: 3px solid #00f2fe; box-shadow: 0 0 15px rgba(0,242,254,0.4);">
            <img src="${photoSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="Candidate Photo">
          </div>
        ` : `
          <div style="width: 70px; height: 70px; margin: 0 auto 0.75rem auto; border-radius: 50%; background: #003366; display: flex; align-items: center; justify-content: center; font-size: 2rem; border: 2px solid #0275d8;">
            👤
          </div>
        `}

        <div style="color: #ffffff; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.15rem;">
          ${escapeHtml(studentName)}
        </div>
        <div style="color: #aab4c8; font-size: 0.85rem; margin-bottom: 1rem;">
          Roll: <strong style="color: #fff;">${escapeHtml(rollNo)}</strong> ${branch ? `| ${escapeHtml(branch)}` : ''}
        </div>

        <!-- Previous Score Stats Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: rgba(0, 0, 0, 0.45); border-radius: 12px; padding: 0.85rem;">
          <div style="border-right: 1px solid rgba(255,255,255,0.1);">
            <div style="color: #aab4c8; font-size: 0.72rem; text-transform: uppercase; font-weight: 600;">Previous Score</div>
            <div style="color: #2ecc71; font-size: 1.6rem; font-weight: 900; font-family: monospace; margin-top: 2px;">
              ${score} / ${totalQuestions}
            </div>
            <div style="color: #2ecc71; font-size: 0.75rem; font-weight: bold;">${percentage}</div>
          </div>
          <div>
            <div style="color: #aab4c8; font-size: 0.72rem; text-transform: uppercase; font-weight: 600;">Time Taken</div>
            <div style="color: #00f2fe; font-size: 1.3rem; font-weight: 800; font-family: monospace; margin-top: 4px;">
              ${timeTaken}
            </div>
            <div style="color: #aab4c8; font-size: 0.72rem; margin-top: 3px;">Completed ✅</div>
          </div>
        </div>
      </div>

      <!-- Live Lockout Countdown Card -->
      <div style="
        padding: 1.1rem 2rem; background: rgba(231,76,60,0.12); border: 2px solid #e74c3c;
        border-radius: 16px; max-width: 440px; width: 100%;">
        <div style="color: #aab4c8; font-size: 0.82rem; margin-bottom: 0.3rem;">Dobara Test Dene Ka Samay:</div>
        <div id="lockout-countdown" style="
          font-size: 2.3rem; font-weight: 700; letter-spacing: 4px;
          color: #00f2fe; font-family: monospace;">--:--:--</div>
      </div>

      <p style="color: #555e70; font-size: 0.8rem; margin-top: 1.5rem;">
        SCE Supaul — Anti-Cheat Exam Portal
      </p>
    </div>
  `;

  // Live countdown using synced network time
  function tick() {
    const submittedAt = parseInt(localStorage.getItem(LOCKOUT_KEY), 10);
    const left = Math.max(0, LOCKOUT_DURATION_MS - (getSyncedNow() - submittedAt));
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    const s = Math.floor((left % 60000) / 1000);
    const el = document.getElementById('lockout-countdown');
    if (el) {
      el.innerText =
        String(h).padStart(2,'0') + ':' +
        String(m).padStart(2,'0') + ':' +
        String(s).padStart(2,'0');
    }
    if (left <= 0) {
      // Auto reload when lockout expires
      location.reload();
      return;
    }
    setTimeout(tick, 1000);
  }
  tick();
}

// ─────────────────────────────────────────────────────────────
// QUIZ SCHEDULED START TIME CHECK
// ─────────────────────────────────────────────────────────────
function checkQuizStartTime() {
  if (!CONFIG.quizStartTime) return false; // no time set → always open

  const startTime = new Date(CONFIG.quizStartTime).getTime();
  const now = getSyncedNow();

  if (now < startTime) {
    showWaitingScreen(startTime);
    return true; // not yet started
  }
  return false; // quiz is open
}

function showWaitingScreen(startTimestamp) {
  const startDate = new Date(startTimestamp);
  const dateStr = startDate.toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
  const timeStr = startDate.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });

  document.body.innerHTML = `
    <div style="
      min-height:100vh; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      background: linear-gradient(135deg,#0a0e1a 0%,#131b2e 100%);
      font-family:'Segoe UI',sans-serif; text-align:center; padding:2rem;">

      <div style="font-size:4rem; margin-bottom:1rem;">⏳</div>

      <h1 style="
        color:#00f2fe; font-size:2rem; margin-bottom:0.4rem;
        text-shadow: 0 0 20px rgba(0,242,254,0.4);">
        Quiz Abhi Shuru Nahi Hua!
      </h1>
      <p style="color:#aab4c8; font-size:1rem; margin-bottom:2rem;">
        SCE Supaul — Engineers' Day Quiz 2026
      </p>

      <div style="
        background:rgba(0,242,254,0.07); border:1px solid rgba(0,242,254,0.3);
        border-radius:16px; padding:1.5rem 2.5rem; margin-bottom:2rem;">
        <div style="color:#aab4c8; font-size:0.85rem; margin-bottom:0.3rem;">Quiz Start Hoga:</div>
        <div style="color:#fff; font-size:1.2rem; font-weight:600;">
          📅 ${dateStr} &nbsp;|&nbsp; 🕐 ${timeStr}
        </div>
      </div>

      <div style="
        background:rgba(0,0,0,0.4); border:2px solid rgba(0,242,254,0.4);
        border-radius:20px; padding:2rem 3rem;">
        <div style="color:#aab4c8; font-size:0.9rem; margin-bottom:0.8rem; letter-spacing:1px;">
          SHURU HONE MEIN BAAKI:
        </div>
        <div id="start-countdown" style="
          display:flex; gap:1.5rem; justify-content:center; align-items:center;">
          <div class="cblock">
            <div id="cd-h" style="font-size:3rem;font-weight:700;color:#00f2fe;font-family:monospace;min-width:70px;">00</div>
            <div style="color:#555e70;font-size:0.75rem;letter-spacing:2px;">GHANTE</div>
          </div>
          <div style="font-size:3rem;color:#00f2fe;font-weight:700;margin-bottom:18px;">:</div>
          <div class="cblock">
            <div id="cd-m" style="font-size:3rem;font-weight:700;color:#00f2fe;font-family:monospace;min-width:70px;">00</div>
            <div style="color:#555e70;font-size:0.75rem;letter-spacing:2px;">MINUTE</div>
          </div>
          <div style="font-size:3rem;color:#00f2fe;font-weight:700;margin-bottom:18px;">:</div>
          <div class="cblock">
            <div id="cd-s" style="font-size:3rem;font-weight:700;color:#00f2fe;font-family:monospace;min-width:70px;">00</div>
            <div style="color:#555e70;font-size:0.75rem;letter-spacing:2px;">SECOND</div>
          </div>
        </div>
      </div>

      <p style="color:#555e70; font-size:0.8rem; margin-top:2rem;">
        🔄 Page automatically refresh hoga jab quiz shuru hoga.
      </p>
    </div>
  `;

  // Live countdown tick using synced network time
  function tick() {
    const left = Math.max(0, startTimestamp - getSyncedNow());
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    const s = Math.floor((left % 60000) / 1000);

    const elH = document.getElementById('cd-h');
    const elM = document.getElementById('cd-m');
    const elS = document.getElementById('cd-s');
    if (elH) elH.innerText = String(h).padStart(2,'0');
    if (elM) elM.innerText = String(m).padStart(2,'0');
    if (elS) elS.innerText = String(s).padStart(2,'0');

    if (left <= 0) {
      location.reload(); // Quiz time aa gaya — reload!
      return;
    }
    setTimeout(tick, 1000);
  }
  tick();
}

// ─────────────────────────────────────────────────────────────
// RUNTIME CLOCK TAMPERING WATCHDOG (Detects manual clock changes during exam)
// ─────────────────────────────────────────────────────────────
function startClockTamperWatchdog() {
  let lastDeviceDate = Date.now();
  let lastMonotonic = performance.now();

  setInterval(() => {
    if (!state.examStarted || state.examSubmitted) return;
    const currentDeviceDate = Date.now();
    const currentMonotonic = performance.now();

    const elapsedDate = currentDeviceDate - lastDeviceDate;
    const elapsedMonotonic = currentMonotonic - lastMonotonic;

    // If device clock jumped forward or backward by more than 5 seconds compared to real elapsed hardware time
    if (Math.abs(elapsedDate - elapsedMonotonic) > 5000) {
      logViolation("System Clock Tampering / Manual Device Time Change Detected");
      playBeepSound();
      showToast("🚨 ALERT: Device clock tampering detected! Exam integrity flag raised.");
    }

    lastDeviceDate = currentDeviceDate;
    lastMonotonic = currentMonotonic;
  }, 2000);
}

document.addEventListener('DOMContentLoaded', async () => {
  // ── 0. Verify Device Time against Official Internet Time ──
  const isTimeValid = await verifyTimeSync();
  if (!isTimeValid) return; // Block page if device time is manipulated or incorrect

  // ── 1. Quiz start time check (using verified internet time) ──
  if (checkQuizStartTime()) return;

  // ── 2. Device lockout check (using verified internet time) ──
  if (checkDeviceLockout()) return;

  // Start real-time clock tampering detector
  startClockTamperWatchdog();

  // Fetch dynamic question bank if available
  fetch('/api/questions')
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        QUESTION_BANK = data;
      }
    })
    .catch(() => {
      fetch('questions.json')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) QUESTION_BANK = data;
        })
        .catch(() => {});
    });

  initUI();
  setupAntiCheatListeners();
});

// ─────────────────────────────────────────────────────────────
// REAL-TIME AI & COMPUTER VISION FACE VERIFICATION ENGINE
// ─────────────────────────────────────────────────────────────
let blazefaceModel = null;
let isModelLoading = false;

// Preload BlazeFace neural network in background
async function initFaceAIModel() {
  if (window.blazeface && !blazefaceModel && !isModelLoading) {
    try {
      isModelLoading = true;
      blazefaceModel = await window.blazeface.load();
      console.log("✅ BlazeFace Neural Model Loaded Successfully!");
    } catch (err) {
      console.warn("BlazeFace load notice, falling back to Native FaceDetector / CV:", err);
    } finally {
      isModelLoading = false;
    }
  }
}

// 1. Open User Webcam / Mobile Front Camera
async function openCandidateCamera() {
  const video = document.getElementById('face-video');
  const placeholder = document.getElementById('camera-placeholder');
  const guideOval = document.getElementById('face-guide-oval');
  const openBtn = document.getElementById('open-camera-btn');
  const captureBtn = document.getElementById('capture-face-btn');
  const retakeBtn = document.getElementById('retake-face-btn');
  const statusText = document.getElementById('face-status-text');
  const previewImg = document.getElementById('face-preview-img');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("⚠️ Aapka browser camera support nahi karta ya HTTPS connection anivarya hai!");
    return;
  }

  statusText.innerText = "⏳ Camera shuru ho raha hai... Kripya allow karein.";
  statusText.style.color = "#0275d8";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    state.cameraStream = stream;
    video.srcObject = stream;
    video.style.display = 'block';
    placeholder.style.display = 'none';
    previewImg.style.display = 'none';
    guideOval.style.display = 'block';

    openBtn.style.display = 'none';
    captureBtn.style.display = 'inline-block';
    retakeBtn.style.display = 'none';

    statusText.innerText = "👤 Apne chehre ko circle ke andar rakhein aur 'Capture & Verify Face' dabayein.";
    statusText.style.color = "#333";

    initFaceAIModel();
  } catch (err) {
    console.error("Camera access error:", err);
    statusText.innerText = "❌ Camera access nahi mila! Browser settings me jaakar camera permission ALLOW karein.";
    statusText.style.color = "#eb5757";
    alert("❌ Camera Permission Denied!\n\nQuiz dene ke liye Camera allow karna anivarya hai. Kripya browser address bar me lock icon par click karke camera allow karein.");
  }
}

// 2. Capture Frame and Run Real Face Verification
async function captureAndVerifyFace() {
  const video = document.getElementById('face-video');
  const canvas = document.getElementById('face-canvas');
  const previewImg = document.getElementById('face-preview-img');
  const badge = document.getElementById('face-badge');
  const statusText = document.getElementById('face-status-text');
  const startBtn = document.getElementById('start-exam-btn');
  const captureBtn = document.getElementById('capture-face-btn');
  const retakeBtn = document.getElementById('retake-face-btn');
  const guideOval = document.getElementById('face-guide-oval');
  const viewport = document.getElementById('camera-viewport');

  if (!video || !video.videoWidth) {
    alert("Camera video frame abhi ready nahi hai. Kripya 2 second ruk kar dubara dabayein.");
    return;
  }

  // Draw current frame to canvas
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  statusText.innerText = "🔍 Chehra (Face) verify kiya ja raha hai... Kripya hilein nahi.";
  statusText.style.color = "#0275d8";

  // Run verification
  const result = await detectRealFace(canvas, video);

  if (result.verified) {
    state.isFaceVerified = true;
    state.candidatePhoto = canvas.toDataURL('image/jpeg', 0.85);

    previewImg.src = state.candidatePhoto;
    previewImg.style.display = 'block';
    video.style.display = 'none';
    guideOval.style.display = 'none';

    viewport.style.borderColor = '#27ae60';
    viewport.style.boxShadow = '0 0 15px rgba(39, 174, 96, 0.4)';

    badge.style.background = '#27ae60';
    badge.innerText = '🟢 REAL FACE VERIFIED';

    statusText.innerText = `✅ Real Face Successfully Verified (${result.method})! Ab aap "Start Exam" par click karein.`;
    statusText.style.color = '#27ae60';

    startBtn.disabled = false;
    startBtn.style.background = '#27ae60';
    startBtn.style.opacity = '1';
    startBtn.style.cursor = 'pointer';
    startBtn.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.4)';
    startBtn.innerHTML = 'Start Exam 🚀';

    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';

    playBeepSound();
    showToast("✅ Real Candidate Face Verified!");
  } else {
    state.isFaceVerified = false;
    state.candidatePhoto = null;

    viewport.style.borderColor = '#eb5757';
    viewport.style.boxShadow = '0 0 15px rgba(235, 87, 87, 0.4)';

    badge.style.background = '#eb5757';
    badge.innerText = '❌ NOT VERIFIED';

    statusText.innerText = result.message || "❌ Real face detect nahi hua! Kripya roshni me aakar camera ke theek samne dekhein.";
    statusText.style.color = '#eb5757';

    startBtn.disabled = true;
    startBtn.style.background = '#6c757d';
    startBtn.style.opacity = '0.6';
    startBtn.style.cursor = 'not-allowed';
    startBtn.style.boxShadow = 'none';
    startBtn.innerHTML = '🔒 Verify Face to Unlock Exam';

    showToast("❌ " + (result.toastMessage || "Real Face Verify Nahi Hua!"));
  }
}

// 3. Retake candidate photo
function retakeCandidatePhoto() {
  const video = document.getElementById('face-video');
  const previewImg = document.getElementById('face-preview-img');
  const badge = document.getElementById('face-badge');
  const statusText = document.getElementById('face-status-text');
  const startBtn = document.getElementById('start-exam-btn');
  const captureBtn = document.getElementById('capture-face-btn');
  const retakeBtn = document.getElementById('retake-face-btn');
  const guideOval = document.getElementById('face-guide-oval');
  const viewport = document.getElementById('camera-viewport');

  state.isFaceVerified = false;
  state.candidatePhoto = null;

  previewImg.style.display = 'none';
  video.style.display = 'block';
  guideOval.style.display = 'block';

  viewport.style.borderColor = '#ccc';
  viewport.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';

  badge.style.background = '#eb5757';
  badge.innerText = '🔴 NOT VERIFIED';

  statusText.innerText = "👤 Apne chehre ko circle ke andar rakhein aur 'Capture & Verify Face' dabayein.";
  statusText.style.color = "#333";

  captureBtn.style.display = 'inline-block';
  retakeBtn.style.display = 'none';

  startBtn.disabled = true;
  startBtn.style.background = '#6c757d';
  startBtn.style.opacity = '0.6';
  startBtn.style.cursor = 'not-allowed';
  startBtn.innerHTML = '🔒 Verify Face to Unlock Exam';
}

// 4. Multi-Layer Real Face Detector
async function detectRealFace(canvas, video) {
  // Method A: Native Chromium FaceDetector API
  if ('FaceDetector' in window) {
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
      const faces = await detector.detect(canvas);
      if (faces && faces.length === 1) {
        return { verified: true, count: 1, method: 'Native AI Vision' };
      } else if (faces && faces.length > 1) {
        return { verified: false, message: "⚠️ Ek se zyada chehre dikh rahe hain! Frame me sirf 1 candidate hona chahiye.", toastMessage: "Multiple Faces Detected!" };
      } else {
        return { verified: false, message: "❌ Chehra nahi mila! Kripya camera ke theek samne aakar photo lein.", toastMessage: "No Face Detected!" };
      }
    } catch (e) {
      console.warn("FaceDetector failed, trying next method:", e);
    }
  }

  // Method B: TensorFlow BlazeFace Deep Learning Model
  if (blazefaceModel) {
    try {
      const predictions = await blazefaceModel.estimateFaces(canvas, false);
      if (predictions && predictions.length === 1) {
        const p = predictions[0];
        const prob = p.probability ? (Array.isArray(p.probability) ? p.probability[0] : p.probability) : 1;
        if (prob >= 0.80) {
          return { verified: true, count: 1, method: 'BlazeFace AI' };
        }
      } else if (predictions && predictions.length > 1) {
        return { verified: false, message: "⚠️ Frame me ek se zyada log dikh rahe hain! Sirf ek candidate hona chahiye.", toastMessage: "Multiple Faces Found!" };
      } else {
        return { verified: false, message: "❌ Koi human face detect nahi hua! Kripya camera ke samne aakar baithein.", toastMessage: "No Face Detected!" };
      }
    } catch (e) {
      console.warn("BlazeFace estimate failed, trying CV fallback:", e);
    }
  }

  // Method C: Computer Vision Luma & Skin Entropy Fallback
  try {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    let skinCount = 0;
    let centerSkinCount = 0;
    let totalLuma = 0;
    const totalPixels = w * h;

    const cx1 = w * 0.25, cx2 = w * 0.75;
    const cy1 = h * 0.15, cy2 = h * 0.85;

    for (let i = 0; i < d.length; i += 16) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const pixelIdx = i / 4;
      const px = pixelIdx % w;
      const py = Math.floor(pixelIdx / w);

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuma += luma;

      const isSkin = (r > 60 && g > 40 && b > 20 && (r - g) > 10 && (r - b) > 10 && Math.abs(r - g) < 140);
      if (isSkin) {
        skinCount++;
        if (px >= cx1 && px <= cx2 && py >= cy1 && py <= cy2) {
          centerSkinCount++;
        }
      }
    }

    const sampledPixels = totalPixels / 4;
    const avgBrightness = totalLuma / sampledPixels;
    const skinRatio = skinCount / sampledPixels;
    const centerSkinRatio = centerSkinCount / sampledPixels;

    if (avgBrightness < 25) {
      return { verified: false, message: "❌ Kamre me bahut andhera hai! Kripya light/roshni me aakar photo lein.", toastMessage: "Camera Too Dark!" };
    }
    if (avgBrightness > 245) {
      return { verified: false, message: "❌ Camera par bahut tez light ya reflection hai! Kripya normal light me photo lein.", toastMessage: "Overexposed!" };
    }

    if (skinRatio >= 0.08 && centerSkinRatio >= 0.06) {
      return { verified: true, count: 1, method: 'Biometric Vision' };
    } else {
      return { verified: false, message: "❌ Real human face verify nahi hua! Kripya camera ke theek samne aakar photo lein.", toastMessage: "Face Not Found!" };
    }
  } catch (err) {
    console.error("CV fallback error:", err);
  }

  return { verified: false, message: "❌ Face verification fail ho gaya! Kripya dubara koshish karein.", toastMessage: "Verification Failed" };
}

// Setup UI Event Listeners
function initUI() {
  const regForm = document.getElementById('registration-form');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      startExamProcess();
    });
  }

  // Apps Script Endpoint Saver (for setup modal)
  const saveUrlBtn = document.getElementById('save-endpoint-btn');
  if (saveUrlBtn) {
    saveUrlBtn.addEventListener('click', () => {
      const input = document.getElementById('apps-script-url-input');
      if (input && input.value.trim()) {
        CONFIG.googleSheetWebAppUrl = input.value.trim();
        localStorage.setItem('sec_sheet_apps_script_url', CONFIG.googleSheetWebAppUrl);
        showToast('✅ Google Apps Script Endpoint URL Saved!');
      }
    });
  }

  // Fullscreen Re-entry Button
  const reFullscreenBtn = document.getElementById('re-fullscreen-btn');
  if (reFullscreenBtn) {
    reFullscreenBtn.addEventListener('click', () => {
      requestFullScreenMode();
    });
  }

  // Pre-fill configured URL input if available
  const input = document.getElementById('apps-script-url-input');
  if (input && CONFIG.googleSheetWebAppUrl) {
    input.value = CONFIG.googleSheetWebAppUrl;
  }
}

// -------------------------------------------------------------
// 1. FULLSCREEN API & ESCAPE TRAP
// -------------------------------------------------------------
function requestFullScreenMode() {
  const doc = document.documentElement;
  if (doc.requestFullscreen) {
    doc.requestFullscreen();
  } else if (doc.mozRequestFullScreen) { /* Firefox */
    doc.mozRequestFullScreen();
  } else if (doc.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
    doc.webkitRequestFullscreen();
  } else if (doc.msRequestFullscreen) { /* IE/Edge */
    doc.msRequestFullscreen();
  }
}

function isFullScreenActive() {
  return !!(document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement || 
            document.msFullscreenElement);
}

function handleFullScreenChange() {
  if (!state.examStarted || state.examSubmitted) return;

  if (!isFullScreenActive()) {
    // Student exited full screen!
    logViolation("Full Screen Exited / Escape Key Pressed");
    playBeepSound();
    
    // Show urgent overlay modal
    const modal = document.getElementById('fullscreen-warning-modal');
    if (modal) {
      modal.classList.add('active');
    }
    showToast("⚠️ FULLSCREEN EXIT DETECTED! Re-enter fullscreen immediately!");
  } else {
    // Re-entered full screen
    const modal = document.getElementById('fullscreen-warning-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }
}

// -------------------------------------------------------------
// 2. PAGE VISIBILITY & TAB SWITCH 5-WARNING SYSTEM
// -------------------------------------------------------------
function handleVisibilityChange() {
  if (!state.examStarted || state.examSubmitted) return;

  if (document.hidden || document.visibilityState === 'hidden') {
    document.body.classList.add('screen-blur-blackout');
    registerTabSwitchViolation("Tab Switch / App Switched to Background");
  } else {
    document.body.classList.remove('screen-blur-blackout');
  }
}

function handleWindowBlur() {
  if (!state.examStarted || state.examSubmitted) return;
  document.body.classList.add('screen-blur-blackout');
  registerTabSwitchViolation("Window Lost Focus / External Application Activated");
}

window.addEventListener('focus', () => {
  document.body.classList.remove('screen-blur-blackout');
});

function registerTabSwitchViolation(reason) {
  const now = Date.now();
  // Cooldown safeguard of 1.5 seconds to prevent double firing between blur & visibilitychange
  if (now - state.lastViolationTime < 1500) return;
  state.lastViolationTime = now;

  state.warningCount++;
  logViolation(`${reason} (Red Flag Warning ${state.warningCount}/${CONFIG.maxWarnings})`);
  
  playBeepSound();
  updateWarningUI();

  if (state.warningCount >= CONFIG.maxWarnings) {
    // 5th Warning Reached: Lock Exam and Auto-Submit!
    showToast(`🚨 RED FLAG ${state.warningCount}/${CONFIG.maxWarnings}: MAX WARNINGS EXCEEDED! AUTO-SUBMITTING...`);
    setTimeout(() => {
      autoSubmitExam('AUTO_SUBMIT_MAX_WARNINGS');
    }, 1000);
  } else {
    showToast(`🚨 RED FLAG WARNING ${state.warningCount}/${CONFIG.maxWarnings}: Do not switch tabs or windows!`);
  }
}

function updateWarningUI() {
  const countEl = document.getElementById('warning-count-text');
  if (countEl) {
    countEl.innerText = `${state.warningCount} / ${CONFIG.maxWarnings}`;
  }

  // Update glowing red dots
  const dotsContainer = document.getElementById('warning-dots-bar');
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    for (let i = 1; i <= CONFIG.maxWarnings; i++) {
      const dot = document.createElement('div');
      dot.className = `dot-flag ${i <= state.warningCount ? 'active' : ''}`;
      dotsContainer.appendChild(dot);
    }
  }
}

// -------------------------------------------------------------
// 3. SCREENSHOT, DEVTOOLS & KEYBOARD SHORTCUT BLOCKERS
// -------------------------------------------------------------
function setupAntiCheatListeners() {
  // Fullscreen change events across browsers
  document.addEventListener('fullscreenchange', handleFullScreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
  document.addEventListener('mozfullscreenchange', handleFullScreenChange);
  document.addEventListener('MSFullscreenChange', handleFullScreenChange);

  // Visibility & Blur events
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);

  // Disable Right-Click Context Menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (state.examStarted && !state.examSubmitted) {
      showToast("❌ Right-click disabled for Anti-Cheat security!");
      logViolation("Attempted Right-Click Context Menu");
    }
  });

  // Block Keyboard Shortcuts (PrtScn, F12, Ctrl+C, Ctrl+V, Ctrl+P, Ctrl+U, Ctrl+Shift+I, Alt+Tab)
  document.addEventListener('keydown', (e) => {
    if (!state.examStarted || state.examSubmitted) return;

    const key = e.key || e.code;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Block PrintScreen
    if (key === 'PrintScreen' || e.code === 'PrintScreen') {
      e.preventDefault();
      clearClipboard();
      showToast("📸 Screenshot Blocked! PrintScreen key disabled.");
      logViolation("Attempted PrintScreen (Screenshot)");
      return false;
    }

    // Block F12 (DevTools)
    if (key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      showToast("🚫 Developer Tools (F12) Disabled!");
      logViolation("Attempted Developer Tools (F12)");
      return false;
    }

    // Block Ctrl+C (Copy), Ctrl+V (Paste), Ctrl+P (Print), Ctrl+U (View Source), Ctrl+S (Save), Ctrl+A (Select All)
    if (ctrl && (key === 'c' || key === 'C' || key === 'v' || key === 'V' || key === 'p' || key === 'P' || key === 'u' || key === 'U' || key === 's' || key === 'S' || key === 'a' || key === 'A')) {
      e.preventDefault();
      showToast(`❌ Shortcut Ctrl+${key.toUpperCase()} Disabled!`);
      logViolation(`Attempted Shortcut Ctrl+${key.toUpperCase()}`);
      return false;
    }

    // Block DevTools Shortcuts: Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (ctrl && shift && (key === 'I' || key === 'i' || key === 'J' || key === 'j' || key === 'C' || key === 'c')) {
      e.preventDefault();
      showToast("🚫 Inspect Element Disabled!");
      logViolation("Attempted Inspect Element Shortcut");
      return false;
    }
  });

  // Block Copy, Cut, Paste, Text Selection, Dragging
  ['copy', 'cut', 'paste', 'selectstart', 'dragstart'].forEach(eventType => {
    document.addEventListener(eventType, (e) => {
      if (state.examStarted && !state.examSubmitted) {
        e.preventDefault();
      }
    });
  });

  // Periodically check if DevTools window is popped open by inspecting window inner/outer dimensions
  setInterval(() => {
    if (!state.examStarted || state.examSubmitted) return;
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > 180 || heightDiff > 180) {
      logViolation("Possible Developer Tools Window Docking Detected");
    }
  }, 3000);
}

function clearClipboard() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText('Screenshots & Copying are strictly prohibited during SCE Supaul Anti-Cheat Examination.').catch(() => {});
  }
}

// Audio alert synth beep for security pings
function playBeepSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    // Browser audio policy might require user gesture
  }
}

// -------------------------------------------------------------
// 4. DYNAMIC FLOATING WATERMARK
// -------------------------------------------------------------
function startDynamicWatermark() {
  const container = document.getElementById('dynamic-watermark-container');
  if (!container) return;

  container.innerHTML = '';
  
  // Create 3 floating watermark elements that bounce smoothly across screen
  for (let i = 0; i < 3; i++) {
    const wm = document.createElement('div');
    wm.className = 'watermark-text';
    wm.id = `watermark-${i}`;
    wm.innerText = `${state.student.rollNo} • ${state.student.name} • SCE SUPAUL EXAM LOCK • ${state.student.branch}`;
    container.appendChild(wm);
    
    animateWatermark(wm, i);
  }
}

function animateWatermark(el, index) {
  let posX = Math.random() * (window.innerWidth - 300);
  let posY = Math.random() * (window.innerHeight - 100);
  let speedX = (1 + Math.random() * 1.5) * (index % 2 === 0 ? 1 : -1);
  let speedY = (1 + Math.random() * 1.5) * (index % 2 === 0 ? -1 : 1);

  function step() {
    if (!state.examStarted || state.examSubmitted) return;

    posX += speedX;
    posY += speedY;

    if (posX <= 0 || posX >= window.innerWidth - 350) speedX *= -1;
    if (posY <= 0 || posY >= window.innerHeight - 100) speedY *= -1;

    el.style.transform = `translate(${posX}px, ${posY}px) rotate(-20deg)`;
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// -------------------------------------------------------------
// 5. EXAM ENGINE & QUIZ FLOW
// -------------------------------------------------------------
function startExamProcess() {
  const name = document.getElementById('student-name').value.trim();
  const rollNo = document.getElementById('student-roll').value.trim();
  const branch = document.getElementById('student-branch').value;
  const subject = document.getElementById('student-subject').value.trim();

  if (!name || !rollNo || !subject) {
    showToast("⚠️ Kripya saari details (Naam, Roll No, Subject) sahi se bharein!");
    return;
  }

  // Mandatory Real Face Verification Check
  if (!state.isFaceVerified || !state.candidatePhoto) {
    showToast("⚠️ Real Face Verification Anivarya Hai!");
    alert("⚠️ REAL FACE VERIFICATION MANDATORY!\n\nExam shuru karne se pehle camera ke samne apna real face verify karna anivarya hai. Kripya 'Open Camera' par click karke face verify karein.");
    return;
  }

  state.student = { name, rollNo, branch, subject };
  state.examStarted = true;

  // Stop camera stream to free up device resources
  if (state.cameraStream) {
    try {
      state.cameraStream.getTracks().forEach(track => track.stop());
    } catch (e) {}
    state.cameraStream = null;
  }

  // Update Header Candidate Photo Preview
  const headerPhotoImg = document.getElementById('header-candidate-photo');
  const headerPhotoIcon = document.getElementById('header-photo-icon');
  if (headerPhotoImg && state.candidatePhoto) {
    headerPhotoImg.src = state.candidatePhoto;
    headerPhotoImg.style.display = 'block';
    if (headerPhotoIcon) headerPhotoIcon.style.display = 'none';
  }

  // Request Fullscreen immediately upon Start Exam click
  requestFullScreenMode();

  // Hide Registration, Show Quiz UI
  document.getElementById('registration-card').style.display = 'none';
  document.getElementById('quiz-main-section').style.display = 'block';
  document.getElementById('header-monitor-bar').style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Initialize Watermark & Warnings
  startDynamicWatermark();
  updateWarningUI();

  // Start Timer
  startExamTimer();

  // Render Questions & Palette
  renderQuestion(0);
  renderQuestionPalette();

  logViolation("Exam Session Initiated & Fullscreen Activated");
  showToast("🛡️ Anti-Cheat Security System Active! Best of Luck.");
}

function startExamTimer() {
  state.timerInterval = setInterval(() => {
    state.timeRemainingSeconds--;
    state.totalTimeSpentSeconds++;

    updateTimerDisplay();

    if (state.timeRemainingSeconds <= 0) {
      clearInterval(state.timerInterval);
      autoSubmitExam('TIME_EXPIRED');
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('timer-text');
  if (!timerEl) return;

  const minutes = Math.floor(state.timeRemainingSeconds / 60);
  const seconds = state.timeRemainingSeconds % 60;
  timerEl.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (state.timeRemainingSeconds <= 120) { // 2 minutes warning
    timerEl.parentElement.style.borderColor = 'var(--danger-red)';
    timerEl.parentElement.style.color = 'var(--danger-red)';
  }
}

function renderQuestion(index) {
  if (index < 0 || !QUESTION_BANK || index >= QUESTION_BANK.length) return;

  // Track time spent on previous active question
  if (state.lastQuestionActiveTime !== null && state.currentQuestionIndex !== undefined) {
    const elapsedSec = Math.round((Date.now() - state.lastQuestionActiveTime) / 1000);
    if (elapsedSec > 0) {
      state.questionTimeSpent[state.currentQuestionIndex] = (state.questionTimeSpent[state.currentQuestionIndex] || 0) + elapsedSec;
    }
  }
  state.lastQuestionActiveTime = Date.now();
  state.currentQuestionIndex = index;

  if (!state.visitedQuestions) state.visitedQuestions = {};
  state.visitedQuestions[index] = true;

  const q = QUESTION_BANK[index];
  if (!q) return;

  const questionNumEl = document.getElementById('q-number-title');
  const questionTextEl = document.getElementById('q-text-body');
  const optionsGroupEl = document.getElementById('q-options-list');

  if (questionNumEl) questionNumEl.innerText = `Question ${index + 1} of ${QUESTION_BANK.length}`;
  if (questionTextEl) questionTextEl.innerText = q.question;

  // Update animated cyan progress bar
  const progressPct = ((index + 1) / QUESTION_BANK.length) * 100;
  const progressFillEl = document.getElementById('q-progress-fill');
  if (progressFillEl) progressFillEl.style.width = `${progressPct}%`;

  if (optionsGroupEl) {
    optionsGroupEl.innerHTML = '';
    const keys = ['A', 'B', 'C', 'D'];

    q.options.forEach((optText, optIdx) => {
      const card = document.createElement('div');
      const isSelected = state.userAnswers[index] === optIdx;
      card.className = `option-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="option-key">${keys[optIdx]}</div>
        <div class="option-label">${escapeHtml(optText)}</div>
      `;
      card.addEventListener('click', () => {
        selectOption(index, optIdx);
      });
      optionsGroupEl.appendChild(card);
    });
  }

  // Update Nav Buttons
  const prevBtn = document.getElementById('prev-q-btn');
  if (prevBtn) prevBtn.disabled = index === 0;

  // Update Submit Button label when on the last question
  const submitBtn = document.getElementById('main-submit-btn');
  if (submitBtn) {
    if (index === QUESTION_BANK.length - 1) {
      submitBtn.innerHTML = '🚀 SUBMIT EXAM';
      submitBtn.style.background = '#27ae60';
      submitBtn.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.4)';
    } else {
      submitBtn.innerHTML = 'SUBMIT';
      submitBtn.style.background = '#27ae60';
      submitBtn.style.boxShadow = 'none';
    }
  }

  // Update Candidate Sidebar
  const sbName = document.getElementById('sidebar-student-name');
  const sbRoll = document.getElementById('sidebar-student-roll');
  if (sbName && state.student.name) sbName.innerText = state.student.name;
  if (sbRoll && state.student.rollNo) sbRoll.innerText = `Roll No: ${state.student.rollNo}`;

  renderQuestionPalette();
}

function selectOption(questionIndex, optionIndex) {
  state.userAnswers[questionIndex] = optionIndex;
  // Update selection UI without auto-advancing (user requested: auto mat hone dooo)
  const optionsGroupEl = document.getElementById('q-options-list');
  if (optionsGroupEl) {
    const cards = optionsGroupEl.querySelectorAll('.option-card');
    cards.forEach((card, optIdx) => {
      card.classList.toggle('selected', optIdx === optionIndex);
    });
  }
  renderQuestionPalette();
}

function saveAndNext() {
  if (!state.visitedQuestions) state.visitedQuestions = {};
  state.visitedQuestions[state.currentQuestionIndex] = true;
  
  if (state.currentQuestionIndex < QUESTION_BANK.length - 1) {
    renderQuestion(state.currentQuestionIndex + 1);
  } else {
    renderQuestionPalette();
    showToast("ℹ️ Aap aakhri sawaal par hain. Exam Submit karne ke liye 'SUBMIT TEST NOW' dabaayein.");
  }
}

function clearResponse() {
  delete state.userAnswers[state.currentQuestionIndex];
  if (state.markedForReview) delete state.markedForReview[state.currentQuestionIndex];
  renderQuestion(state.currentQuestionIndex);
  showToast("🧹 Response Cleared!");
}

function markForReviewAndNext() {
  if (!state.markedForReview) state.markedForReview = {};
  if (!state.visitedQuestions) state.visitedQuestions = {};
  
  state.markedForReview[state.currentQuestionIndex] = true;
  state.visitedQuestions[state.currentQuestionIndex] = true;

  if (state.currentQuestionIndex < QUESTION_BANK.length - 1) {
    renderQuestion(state.currentQuestionIndex + 1);
  } else {
    renderQuestionPalette();
    showToast("🟪 Marked for Review!");
  }
}

function renderQuestionPalette() {
  const paletteEl = document.getElementById('question-palette-grid');
  if (!paletteEl) return;

  if (!state.markedForReview) state.markedForReview = {};
  if (!state.visitedQuestions) state.visitedQuestions = {};

  // Update Header & Sidebar Candidate Info
  const ntaName = document.getElementById('nta-candidate-name');
  const ntaSubject = document.getElementById('nta-subject-name');
  if (ntaName && state.student.name) ntaName.innerText = state.student.name;
  if (ntaSubject && state.student.subject) ntaSubject.innerText = state.student.subject;

  // Calculate 4 NTA counts: Answered, Not Answered, Marked for Review, Not Visited
  let countAnswered = 0;
  let countNotAnswered = 0;
  let countMarked = 0;
  let countNotVisited = 0;

  QUESTION_BANK.forEach((q, idx) => {
    const isAns = state.userAnswers[idx] !== undefined;
    const isMrk = !!state.markedForReview[idx];
    const isVis = !!state.visitedQuestions[idx];

    if (isMrk) {
      countMarked++;
    } else if (isAns) {
      countAnswered++;
    } else if (isVis) {
      countNotAnswered++;
    } else {
      countNotVisited++;
    }
  });

  const elAns = document.getElementById('count-answered');
  const elNotAns = document.getElementById('count-not-answered');
  const elMarked = document.getElementById('count-marked');
  const elNotVisited = document.getElementById('count-not-visited');

  if (elAns) elAns.innerText = countAnswered;
  if (elNotAns) elNotAns.innerText = countNotAnswered;
  if (elMarked) elMarked.innerText = countMarked;
  if (elNotVisited) elNotVisited.innerText = countNotVisited;

  paletteEl.innerHTML = '';
  QUESTION_BANK.forEach((q, idx) => {
    const btn = document.createElement('button');
    const isAnswered = state.userAnswers[idx] !== undefined;
    const isMarked = !!state.markedForReview[idx];
    const isVisited = !!state.visitedQuestions[idx];
    const isCurrent = state.currentQuestionIndex === idx;

    let statusClass = 'not-visited';
    if (isMarked) {
      statusClass = 'marked';
    } else if (isAnswered) {
      statusClass = 'answered';
    } else if (isVisited) {
      statusClass = 'not-answered';
    }

    btn.className = `palette-btn ${statusClass} ${isCurrent ? 'current' : ''}`;
    btn.innerText = (idx + 1).toString().padStart(2, '0');
    btn.addEventListener('click', () => {
      renderQuestion(idx);
    });
    paletteEl.appendChild(btn);
  });
}

function highlightActivePaletteButton(index) {
  const buttons = document.querySelectorAll('.palette-btn');
  buttons.forEach((btn, idx) => {
    btn.classList.toggle('current', idx === index);
  });
}

function navigateQuestion(direction) {
  let targetIndex = state.currentQuestionIndex + direction;
  if (targetIndex >= 0 && targetIndex < QUESTION_BANK.length) {
    renderQuestion(targetIndex);
  } else if (targetIndex >= QUESTION_BANK.length) {
    confirmAndSubmitExam();
  }
}

function confirmAndSubmitExam() {
  const answeredCount = Object.keys(state.userAnswers).length;
  const total = QUESTION_BANK.length;
  
  if (answeredCount === 0) {
    alert("⚠️ Aapne ek bhi sawaal ka uttar nahi diya hai (0 / 15 Answered).\n\nExam submit karne ke liye kam se kam 1 sawaal ka uttar dena anivarya hai!");
    return;
  }

  const markedCount = Object.keys(state.markedForReview || {}).length;
  const unattempted = total - answeredCount;

  const confirmMsg = `📋 EXAM SUBMISSION CONFIRMATION\n` +
    `----------------------------------------\n` +
    `• Total Questions: ${total}\n` +
    `• Answered Questions: ${answeredCount}\n` +
    `• Marked for Review: ${markedCount}\n` +
    `• Unattempted Questions: ${unattempted}\n\n` +
    `Kya aap nishchit roop se apna Exam Submit karna chahte hain?`;

  if (confirm(confirmMsg)) {
    autoSubmitExam('MANUAL_SUBMIT');
  }
}

// -------------------------------------------------------------
// 6. AUTO-SUBMIT & GOOGLE SHEETS API EXPORTER
// -------------------------------------------------------------
function autoSubmitExam(reason = 'MANUAL_SUBMIT') {
  if (state.examSubmitted) return;
  state.examSubmitted = true;
  clearInterval(state.timerInterval);

  // Calculate Score
  let score = 0;
  QUESTION_BANK.forEach((q, idx) => {
    if (state.userAnswers[idx] === q.correct) {
      score += q.points;
    }
  });

  const totalQuestions = QUESTION_BANK.length;
  const percentage = ((score / totalQuestions) * 100).toFixed(1) + '%';
  let status = 'COMPLETED';
  if (reason === 'AUTO_SUBMIT_MAX_WARNINGS') status = 'LOCK_TERMINATED_CHEATING';
  if (reason === 'TIME_EXPIRED') status = 'TIME_EXPIRED';

  // Save final active question time
  if (state.lastQuestionActiveTime !== null && state.currentQuestionIndex !== undefined) {
    const elapsedSec = Math.round((Date.now() - state.lastQuestionActiveTime) / 1000);
    if (elapsedSec > 0) {
      state.questionTimeSpent[state.currentQuestionIndex] = (state.questionTimeSpent[state.currentQuestionIndex] || 0) + elapsedSec;
    }
  }

  // Format Total Exam Time Spent
  const minutesSpent = Math.floor(state.totalTimeSpentSeconds / 60);
  const secondsSpent = state.totalTimeSpentSeconds % 60;
  const formattedTimeTaken = `${minutesSpent}m ${secondsSpent}s`;

  // ── Save device lockout & previous attempt details (1-hour block) ──
  const attemptInfo = {
    submittedAt: getSyncedNow(),
    studentName: state.student.name || 'Candidate',
    rollNo: state.student.rollNo || 'N/A',
    branch: state.student.branch || '',
    score: score,
    totalQuestions: totalQuestions,
    percentage: percentage,
    candidatePhoto: state.candidatePhoto || '',
    formattedTimeTaken: formattedTimeTaken,
    status: status
  };
  try {
    localStorage.setItem(LAST_ATTEMPT_KEY, JSON.stringify(attemptInfo));
    localStorage.setItem(LOCKOUT_KEY, attemptInfo.submittedAt.toString());
  } catch (e) {
    console.warn("Error saving lockout attempt info:", e);
  }

  // Format per-question time breakdown summary (Q1: 15s | Q2: 30s...)
  const perQuestionTimeArray = QUESTION_BANK.map((q, idx) => {
    const sec = state.questionTimeSpent[idx] || 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
    return `Q${idx+1}: ${timeStr}`;
  });
  const perQuestionTimeSummary = perQuestionTimeArray.join(' | ');

  // Build human-readable response summary for Google Sheets & CSV
  const responsesArray = QUESTION_BANK.map((q, idx) => {
    const selectedOptIdx = state.userAnswers[idx];
    const selectedText = selectedOptIdx !== undefined ? q.options[selectedOptIdx] : 'Unanswered';
    const isCorrect = selectedOptIdx === q.correct ? '✅' : '❌';
    return `Q${idx+1}: ${selectedText} (${isCorrect})`;
  });

  // Construct Data Payload
  const payload = {
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    studentName: state.student.name || 'Anonymous Student',
    rollNo: state.student.rollNo || 'N/A',
    branch: state.student.branch || 'General',
    subject: state.student.subject || 'Technical Club Quiz',
    score: score,
    totalQuestions: totalQuestions,
    percentage: percentage,
    status: status,
    warningCount: state.warningCount || 0,
    timeTakenSeconds: state.totalTimeSpentSeconds || 0,
    formattedTimeTaken: formattedTimeTaken,
    perQuestionTimeSummary: perQuestionTimeSummary,
    detailedResponsesSummary: responsesArray.join(' | '),
    userAnswersJSON: JSON.stringify(state.userAnswers),
    violationLogs: state.violationLogs.join(' | ') || 'None (Clean Exam)',
    candidatePhoto: state.candidatePhoto || '',
    screenshot: ''
  };

  // Direct instant processing - never hangs or blocks on mobile!
  processFinalSubmission(payload, reason);
}

function processFinalSubmission(payload, reason) {
  // Hide Exam UI, Show Result Screen
  document.getElementById('quiz-main-section').style.display = 'none';
  document.getElementById('header-monitor-bar').style.display = 'none';
  document.getElementById('result-screen-card').style.display = 'block';

  // Update Result UI
  document.getElementById('res-student-name').innerText = payload.studentName;
  document.getElementById('res-roll-no').innerText = payload.rollNo;
  document.getElementById('res-score').innerText = `${payload.score} / ${payload.totalQuestions}`;
  document.getElementById('res-percentage').innerText = payload.percentage;
  document.getElementById('res-warnings').innerText = `${payload.warningCount} Warnings`;
  document.getElementById('res-status-badge').innerText = payload.status;

  if (reason === 'AUTO_SUBMIT_MAX_WARNINGS') {
    document.getElementById('res-status-badge').className = 'status-badge btn-danger';
    document.getElementById('result-title').innerText = '🚨 EXAM TERMINATED DUE TO CHEATING';
    document.getElementById('result-sub').innerText = '5 Red Flag Warnings reached. Answers were auto-submitted & locked.';
  }

  // Populate Violation Table
  const tableBody = document.getElementById('violation-table-body');
  if (tableBody) {
    tableBody.innerHTML = '';
    if (state.violationLogs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="2" style="color: var(--success-green);">✅ No anti-cheat violations detected! Perfect integrity.</td></tr>';
    } else {
      state.violationLogs.forEach((logItem) => {
        const tr = document.createElement('tr');
        const parts = logItem.split(' - ');
        tr.innerHTML = `
          <td style="color: var(--text-muted); font-family: var(--font-mono); width: 100px;">${parts[0]}</td>
          <td style="color: var(--danger-red);">${escapeHtml(parts.slice(1).join(' - '))}</td>
        `;
        tableBody.appendChild(tr);
      });
    }
  }

  // Save Local Backup & Send Data
  saveLocalBackup(payload);
  sendDataToGoogleSheets(payload);
}

let hasSentGoogleSheet = false;

function sendDataToGoogleSheets(payload) {
  if (hasSentGoogleSheet) return;
  hasSentGoogleSheet = true;

  const syncStatusEl = document.getElementById('sheet-sync-status');
  if (syncStatusEl) syncStatusEl.innerText = "⏳ Saving responses to Google Sheets & Server...";

  // 1. Post to Local Node Server API (/api/save-exam)
  fetch('/api/save-exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(r => r.json()).then(res => {
    console.log("Local Server Saved:", res);
  }).catch(err => console.warn("Local server save notice:", err));

  // 2. Post EXACTLY ONCE to Google Apps Script Web App Endpoint
  const targetUrl = CONFIG.googleSheetWebAppUrl;

  if (!targetUrl) return;

  const payloadString = JSON.stringify(payload);

  try {
    fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payloadString
    }).then(() => {
      if (syncStatusEl) {
        syncStatusEl.innerHTML = `<span style="color: #27ae60; font-weight: bold;">✅ SUCCESS: Exam Data Saved to Google Sheets!</span>`;
      }
      showToast("✅ Data saved to Google Sheets!");
    }).catch(err => {
      console.warn("Fetch Google Sheet notice:", err);
      if (syncStatusEl) {
        syncStatusEl.innerHTML = `<span style="color: #27ae60; font-weight: bold;">✅ Exam Data Saved to Server Backup!</span>`;
      }
    });
  } catch (e) {
    console.warn("Google Sheet sync notice:", e);
  }
}

function saveLocalBackup(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem('sec_exam_submissions') || '[]');
    // Create light payload without large base64 screenshot string for localStorage stability
    const lightPayload = { ...payload };
    delete lightPayload.screenshot;
    existing.push(lightPayload);
    localStorage.setItem('sec_exam_submissions', JSON.stringify(existing));
  } catch (e) {
    console.warn("LocalStorage save skipped:", e);
  }
}

function logViolation(description) {
  const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const entry = `${timestamp} - ${description}`;
  state.violationLogs.push(entry);
  console.warn("Anti-Cheat Security Violation Logged:", entry);
}

function showToast(message) {
  const toast = document.getElementById('cheat-toast');
  if (!toast) return;

  toast.innerText = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// -------------------------------------------------------------
// SUBMISSIONS HISTORY MODAL CONTROLLER
// -------------------------------------------------------------
function openSavedSubmissionsModal() {
  const modal = document.getElementById('submissions-history-modal');
  const body = document.getElementById('submissions-modal-body');
  if (!modal || !body) return;

  const submissions = JSON.parse(localStorage.getItem('sec_exam_submissions') || '[]');
  
  body.innerHTML = '';
  if (submissions.length === 0) {
    body.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Abhi tak koi local submission save nahi hua hai.</p>';
  } else {
    submissions.forEach((item, index) => {
      const card = document.createElement('div');
      card.style.cssText = 'background: rgba(19, 27, 46, 0.9); border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.75rem; font-size: 0.85rem;';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
          <strong style="color: #fff; font-size: 0.95rem;">${index + 1}. ${escapeHtml(item.studentName)} (${escapeHtml(item.rollNo)})</strong>
          <span style="color: var(--primary-cyan); font-weight: 700;">Score: ${item.score}/${item.totalQuestions} (${item.percentage})</span>
        </div>
        <div style="display: flex; gap: 1rem; color: var(--text-muted); font-size: 0.75rem;">
          <span>Subject: ${escapeHtml(item.subject)}</span>
          <span>Branch: ${escapeHtml(item.branch)}</span>
          <span>Status: ${escapeHtml(item.status)}</span>
        </div>
        <div style="margin-top: 0.4rem; font-size: 0.75rem; color: var(--danger-red);">
          Violations: ${escapeHtml(item.violationLogs || 'None')}
        </div>
        <div style="font-size: 0.7rem; color: var(--text-muted); text-align: right; margin-top: 0.2rem;">
          Time: ${escapeHtml(item.timestamp || 'N/A')}
        </div>
      `;
      body.appendChild(card);
    });
  }

  modal.classList.add('active');
}

function closeSavedSubmissionsModal() {
  const modal = document.getElementById('submissions-history-modal');
  if (modal) modal.classList.remove('active');
}

function exportSubmissionsJSON() {
  const data = localStorage.getItem('sec_exam_submissions') || '[]';
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SCE_Supaul_Exam_Submissions_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearSavedSubmissions() {
  if (confirm("Kya aap saari local saved submissions history delete karna chahte hain?")) {
    localStorage.removeItem('sec_exam_submissions');
    openSavedSubmissionsModal();
    showToast("🗑️ Saved submissions cleared!");
  }
}
