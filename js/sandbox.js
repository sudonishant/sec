/*
  ================================================================
  SEC SUPAUL TECHNICAL CLUB - INTERACTIVE SANDBOX & PLAYGROUND
  Code Arena & Microcontroller Circuit Simulator Logic
  ================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
  // Sandbox Tab Switching
  const tabBtns = document.querySelectorAll('.sandbox-tab');
  const tabPanels = document.querySelectorAll('.sandbox-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Code Arena Logic
  const codeArea = document.getElementById('code-input');
  const runCodeBtn = document.getElementById('run-code-btn');
  const clearLogsBtn = document.getElementById('clear-logs-btn');
  const terminalLogs = document.getElementById('terminal-logs');
  const templateSelect = document.getElementById('code-template-select');

  const templates = {
    sensor: `// SEC Supaul IoT Sensor Processing Algorithm
function processSensorData(readings) {
  console.log("Analyzing " + readings.length + " telemetry samples...");
  let sum = 0;
  readings.forEach((val, index) => {
    sum += val;
    console.log(\`Sample #\${index + 1}: \${val.toFixed(2)} °C\`);
  });
  let avg = sum / readings.length;
  console.log(\`>> Status: Average Temp = \${avg.toFixed(2)} °C [NORMAL]\`);
  return avg;
}

processSensorData([28.4, 29.1, 28.9, 30.2, 27.8]);`,

    robotics: `// SEC Supaul Rover Motors PWM Control Logic
class RoverController {
  constructor(speed) {
    this.speed = speed;
  }
  moveForward() {
    console.log(">> Motors L/R Engaged | PWM Speed: " + this.speed + "%");
    console.log(">> Obstacle Radar: CLEAR (Distance: 120cm)");
  }
}

const bot = new RoverController(85);
bot.moveForward();`,

    dsa: `// SEC Supaul Competitive Coding - Fast Matrix Search
function searchMatrix(matrix, target) {
  console.log("Executing Binary Search on " + matrix.length + "x" + matrix[0].length + " matrix...");
  let found = matrix.some(row => row.includes(target));
  console.log(\`>> Target \${target} found: \${found ? "YES (O(log N*M))" : "NO"}\`);
}

searchMatrix([[1, 4, 7], [10, 11, 16], [23, 30, 34]], 11);`
  };

  if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (templates[selected]) {
        codeArea.value = templates[selected];
      }
    });
  }

  if (runCodeBtn && terminalLogs && codeArea) {
    runCodeBtn.addEventListener('click', () => {
      const code = codeArea.value;
      terminalLogs.innerHTML = `<div class="log-line log-info">[${new Date().toLocaleTimeString()}] Executing script on SEC-Engine v2.4...</div>`;

      // Intercept console.log safely
      const logs = [];
      const customConsole = {
        log: (...args) => {
          logs.push(args.join(' '));
        },
        error: (...args) => {
          logs.push(`[ERROR] ${args.join(' ')}`);
        }
      };

      try {
        const runFn = new Function('console', code);
        runFn(customConsole);

        logs.forEach(msg => {
          const line = document.createElement('div');
          line.className = 'log-line ' + (msg.includes('ERROR') ? 'log-warning' : 'log-success');
          line.textContent = msg;
          terminalLogs.appendChild(line);
        });

        const doneLine = document.createElement('div');
        doneLine.className = 'log-line log-info';
        doneLine.textContent = `[${new Date().toLocaleTimeString()}] Execution finished cleanly with exit code 0.`;
        terminalLogs.appendChild(doneLine);

      } catch (err) {
        const errLine = document.createElement('div');
        errLine.className = 'log-line log-warning';
        errLine.textContent = `Syntax / Runtime Exception: ${err.message}`;
        terminalLogs.appendChild(errLine);
      }

      terminalLogs.scrollTop = terminalLogs.scrollHeight;
    });
  }

  if (clearLogsBtn && terminalLogs) {
    clearLogsBtn.addEventListener('click', () => {
      terminalLogs.innerHTML = `<div class="log-line log-info">Terminal reset. Ready for compilation.</div>`;
    });
  }

  // Circuit Simulator Logic
  const powerSwitch = document.getElementById('switch-power');
  const pirSwitch = document.getElementById('switch-pir');
  const ldrSwitch = document.getElementById('switch-ldr');
  const ledIndicator = document.getElementById('led-indicator');
  const circuitStatus = document.getElementById('circuit-status-text');
  const pinOutput = document.getElementById('pin-output');

  function updateCircuitState() {
    if (!powerSwitch || !ledIndicator) return;

    const isPowered = powerSwitch.checked;
    const isMotionDetected = pirSwitch ? pirSwitch.checked : false;
    const isDark = ldrSwitch ? ldrSwitch.checked : false;

    if (!isPowered) {
      ledIndicator.classList.remove('active');
      circuitStatus.textContent = 'System Powered OFF (0.0 V)';
      circuitStatus.style.color = 'var(--text-muted)';
      pinOutput.textContent = 'Pin D13: LOW | Relay: OPEN | Current: 0mA';
      return;
    }

    if (isMotionDetected || isDark) {
      ledIndicator.classList.add('active');
      circuitStatus.textContent = 'TRIGGERED: LED Glowing & Buzzer Active!';
      circuitStatus.style.color = 'var(--accent-green)';
      pinOutput.textContent = 'Pin D13: HIGH (5.0V) | Relay: CLOSED | Signal: ACTIVE';
    } else {
      ledIndicator.classList.remove('active');
      circuitStatus.textContent = 'Power ON: Waiting for Sensor Trigger...';
      circuitStatus.style.color = 'var(--accent-cyan)';
      pinOutput.textContent = 'Pin D13: LOW (0.0V) | Standby Mode';
    }
  }

  if (powerSwitch) powerSwitch.addEventListener('change', updateCircuitState);
  if (pirSwitch) pirSwitch.addEventListener('change', updateCircuitState);
  if (ldrSwitch) ldrSwitch.addEventListener('change', updateCircuitState);
});
