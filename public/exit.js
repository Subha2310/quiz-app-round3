// ===== EXIT PAGE SCRIPT =====

// Utility: format date/time nicely
function formatDateTime(isoString) {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Utility: calculate duration (minutes:seconds)
function calculateDuration(start, end) {
  if (!start || !end) return "N/A";
  const startTime = new Date(start);
  const endTime = new Date(end);
  const diffMs = endTime - startTime;
  if (diffMs < 0) return "N/A";

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

// ===== MAIN =====
document.addEventListener("DOMContentLoaded", () => {
  const nameElem = document.getElementById("user-name");
  const scoreElem = document.getElementById("user-score");
  const submittedElem = document.getElementById("submitted-time");
  const durationElem = document.getElementById("duration");
  const statusBox = document.getElementById("status");

  // Retrieve stored info
  const participant = JSON.parse(localStorage.getItem("participant")) || {};
  const score = localStorage.getItem("score");
  const createdAt = localStorage.getItem("createdAt");
  const submittedAt = localStorage.getItem("submittedAt");
  const quizStatus = localStorage.getItem("quizStatus");

  // Populate participant name
  nameElem.textContent = participant.username || "Participant";
  scoreElem.textContent = score || "0";
  submittedElem.textContent = formatDateTime(submittedAt);
  durationElem.textContent = calculateDuration(createdAt, submittedAt);

  // Status styling
  if (quizStatus === "completed") {
    statusBox.textContent = "Status: Completed";
    statusBox.classList.add("completed");
  } else if (quizStatus === "timeout") {
    statusBox.textContent = "Status: Timeout";
    statusBox.classList.add("timeout");
  } else if (quizStatus === "disqualified") {
    statusBox.textContent = "Status: Disqualified";
    statusBox.classList.add("disqualified");
  } else {
    statusBox.textContent = "Status: Unknown";
  }

  // Optional: clear temporary quiz data
  localStorage.removeItem("answers");
});
