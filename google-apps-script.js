/**
 * ================================================================
 * GOOGLE APPS SCRIPT FOR ANTI-CHEAT EXAM SYSTEM
 * Technical Club - Supaul College of Engineering (SCE Supaul)
 * Target Google Sheet URL:
 * https://docs.google.com/spreadsheets/d/1_f64wJJEpDgqLm5jzWza-Twf2ZXnST_Soqv2JEQidig/edit?usp=drivesdk
 * ================================================================
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto-create headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", 
        "Student Name", 
        "Roll Number", 
        "Branch", 
        "Subject", 
        "Score", 
        "Total Questions", 
        "Percentage", 
        "Total Time Taken",
        "Per-Question Time",
        "Status", 
        "Warning Count", 
        "Candidate Photo",
        "Detailed Responses", 
        "Violation Logs"
      ]);
      
      // Style headers
      var headerRange = sheet.getRange(1, 1, 1, 15);
      headerRange.setBackground("#0d1322");
      headerRange.setFontColor("#00f2fe");
      headerRange.setFontWeight("bold");
    }

    // Safely extract incoming data (handles text/plain, application/json, and form parameters)
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var photoVal = data.candidatePhoto || "N/A";
    if (photoVal.indexOf("http") === 0) {
      photoVal = '=IMAGE("' + photoVal + '")';
    }

    // Append row to Google Sheet
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data.studentName || "N/A",
      "'" + (data.rollNo || "N/A"), // Quote prefix prevents scientific notation for long roll numbers
      data.branch || "N/A",
      data.subject || "N/A",
      data.score !== undefined ? data.score : 0,
      data.totalQuestions !== undefined ? data.totalQuestions : 0,
      data.percentage || "0%",
      data.formattedTimeTaken || "N/A",
      data.perQuestionTimeSummary || "N/A",
      data.status || "COMPLETED",
      data.warningCount !== undefined ? data.warningCount : 0,
      photoVal,
      data.detailedResponsesSummary || "N/A",
      data.violationLogs || "None"
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Exam data saved successfully to Google Sheets!" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      result.push({
        timestamp: row[0],
        studentName: row[1],
        rollNo: String(row[2]).replace(/^'/, ''),
        branch: row[3],
        subject: row[4],
        score: Number(row[5]),
        totalQuestions: Number(row[6]),
        percentage: row[7],
        status: row[8],
        warningCount: Number(row[9]),
        timeTakenSeconds: Number(row[10]),
        violationLogs: row[12]
      });
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
}
