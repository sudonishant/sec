/**
 * ================================================================
 * AUTOMATED BACKEND SERVER & EXCEL/CSV GENERATOR
 * Technical Club - Supaul College of Engineering (SCE Supaul)
 * Anti-Cheat Exam Portal API Proxy & Submissions Storage
 * ================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');
const CSV_FILE = path.join(__dirname, 'submissions.csv');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Auto-initialize CSV header if file doesn't exist
if (!fs.existsSync(CSV_FILE)) {
  const csvHeader = 'Timestamp,Student Name,Roll Number,Branch,Subject,Score,Total Questions,Percentage,Total Time Taken,Per-Question Time,Status,Warning Count,Detailed Responses,Violation Logs\n';
  fs.writeFileSync(CSV_FILE, csvHeader, 'utf8');
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Health check endpoint
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', system: 'SCE Supaul Anti-Cheat Exam Server', timestamp: new Date().toISOString() }));
    return;
  }

  // Get Questions API Endpoint
  if (pathname === '/api/questions' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const qFile = path.join(__dirname, 'questions.json');
    if (fs.existsSync(qFile)) {
      res.end(fs.readFileSync(qFile, 'utf8'));
    } else {
      res.end(JSON.stringify([]));
    }
    return;
  }

  // Save/Update Questions API Endpoint
  if (pathname === '/api/save-questions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const qData = JSON.parse(body);
        const qFile = path.join(__dirname, 'questions.json');
        fs.writeFileSync(qFile, JSON.stringify(qData, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Questions updated successfully!' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Save Exam Submission Endpoint
  if (pathname === '/api/save-exam' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const examData = JSON.parse(body);
        console.log(`[SUBMISSION RECEIVED] Student: ${examData.studentName} (${examData.rollNo}), Score: ${examData.score}/${examData.totalQuestions}, Warnings: ${examData.warningCount}`);

        // 1. Save to JSON File
        let existingData = [];
        if (fs.existsSync(SUBMISSIONS_FILE)) {
          const content = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
          if (content) existingData = JSON.parse(content);
        }

        const record = {
          id: Date.now(),
          receivedAt: new Date().toISOString(),
          ...examData
        };

        existingData.push(record);
        fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(existingData, null, 2), 'utf8');

        // 2. Auto-Append to CSV File (Excel & Google Sheets Compatible)
        const timeSpentStr = examData.formattedTimeTaken || `${Math.floor((examData.timeTakenSeconds || 0) / 60)}m ${(examData.timeTakenSeconds || 0) % 60}s`;

        const csvRow = [
          `"${examData.timestamp || new Date().toLocaleString()}"`,
          `"${(examData.studentName || 'N/A').replace(/"/g, '""')}"`,
          `"'${examData.rollNo || 'N/A'}"`, // Quote prevents scientific notation
          `"${(examData.branch || 'N/A').replace(/"/g, '""')}"`,
          `"${(examData.subject || 'N/A').replace(/"/g, '""')}"`,
          examData.score !== undefined ? examData.score : 0,
          examData.totalQuestions !== undefined ? examData.totalQuestions : 0,
          `"${examData.percentage || '0%'}"`,
          `"${timeSpentStr}"`,
          `"${(examData.perQuestionTimeSummary || 'N/A').replace(/"/g, '""')}"`,
          `"${examData.status || 'COMPLETED'}"`,
          examData.warningCount !== undefined ? examData.warningCount : 0,
          `"${(examData.detailedResponsesSummary || 'N/A').replace(/"/g, '""')}"`,
          `"${(examData.violationLogs || 'None').replace(/"/g, '""')}"`
        ].join(',') + '\n';

        fs.appendFileSync(CSV_FILE, csvRow, 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Exam submission saved successfully to Local Storage & CSV!',
          recordId: Date.now()
        }));
      } catch (err) {
        console.error('Save error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Get Submissions JSON Endpoint
  if (pathname === '/api/submissions' && req.method === 'GET') {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data || '[]');
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
    return;
  }

  // Download CSV File Endpoint
  if (pathname === '/api/download-csv' && req.method === 'GET') {
    if (fs.existsSync(CSV_FILE)) {
      const data = fs.readFileSync(CSV_FILE, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="SCE_Supaul_Exam_Results.csv"'
      });
      res.end(data);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No CSV data available yet.');
    }
    return;
  }

  // Serve Static Files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================`);
  console.log(`🛡️ SCE Supaul Anti-Cheat Exam Server Active!`);
  console.log(`🌐 Open Exam Portal: http://localhost:${PORT}/exam.html`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`📄 Auto CSV Export File: ${CSV_FILE}`);
  console.log(`================================================`);
});
