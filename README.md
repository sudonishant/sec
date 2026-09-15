# 🛡️ SCE Supaul - Anti-Cheat Examination Portal & Web System
> **Official Technical Club Project | Supaul College of Engineering (BEU Patna • Govt. of Bihar)**

---

## 📁 Project Folder Structure

```
sec/
├── 📄 index.html               # Main Technical Club Portal
├── 🛡️ exam.html                # Anti-Cheat Student Exam Portal (Fullscreen, Watermark, Red Flags)
├── 📊 admin.html               # Teacher & Admin Live Results Dashboard
├── ⚙️ vercel.json               # Vercel 1-Click Deployment Config
├── 📦 package.json              # Node.js Server Package Manifest
├── 🖥️ server.js                # Standalone Node Server & Auto CSV Export
├── 📜 google-apps-script.js    # Google Sheets Apps Script Backend Code
├── 📄 submissions.csv          # Saved Student Exam Results (Excel/CSV Format)
├── 🎨 css/
│   ├── style.css              # Main Portal Stylesheet
│   └── exam.css               # Anti-Cheat & Glassmorphism Exam Stylesheet
├── ⚡ js/
│   ├── anti-cheat-exam.js     # Core Anti-Cheat Engine (15 Questions, Fullscreen, Red Flags, Watermark)
│   ├── app.js                 # App Logic
│   ├── bot.js                 # Helper Bot
│   ├── canvas.js              # Background Canvas Particles
│   ├── generator.js           # Generator Utilities
│   └── sandbox.js             # Testing Utilities
└── 🖼️ assets/                  # Logos, Campus Pictures & Event Media
```

---

## 🛡️ Anti-Cheat Core Features

1. **Compulsory Fullscreen Mode:** `requestFullscreen()` activates when starting the exam. Exiting full screen (Esc key) locks the exam with an urgent warning modal.
2. **5 Red Flags / Tab Switch System:** Page Visibility & Blur APIs track tab/app switching. At the 5th warning, answers are automatically submitted and locked.
3. **Screenshot & Copy/Paste Blockers:** Disables Right-Click, PrtScn, F12, Ctrl+C/V/P/U/Shift+I.
4. **Dynamic Watermark:** Student Roll Number & Full Name float smoothly across the screen to prevent phone camera leaks.
5. **Auto Data Backup:** Saves results automatically to `submissions.csv`, `localStorage`, and Google Sheets.

---

---

## 📄 License
Created for Supaul College of Engineering (SCE Supaul) Technical Club. All rights reserved.
