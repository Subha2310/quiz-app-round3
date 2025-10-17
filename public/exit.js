document.addEventListener("DOMContentLoaded", () => {
  const participant = JSON.parse(localStorage.getItem("participant")) || {};
  const score = localStorage.getItem("score") || "0";
  const createdAt = localStorage.getItem("createdAt");
  const submittedAt = localStorage.getItem("submittedAt");
  const quizStatus = localStorage.getItem("quizStatus");

  const nameElem = document.getElementById("name");
  const scoreElem = document.getElementById("score");
  const submittedElem = document.getElementById("submittedAt");
  const durationElem = document.getElementById("duration");
  const statusBox = document.getElementById("status-box");
  const scoreRow = document.getElementById("score-row");

  nameElem.textContent = participant.username || "Participant";

  // Status display
  if (quizStatus === "completed") {
    statusBox.textContent = "✅ Completed Successfully";
    statusBox.classList.add("completed");
  } else if (quizStatus === "timeout") {
    statusBox.textContent = "⏰ Time Up";
    statusBox.classList.add("timeout");
  } else if (quizStatus === "disqualified") {
    statusBox.textContent = "🚫 Disqualified";
    statusBox.classList.add("disqualified");
    scoreRow.classList.add("hidden");
  } else {
    statusBox.textContent = "⚠️ Unknown Status";
    scoreRow.classList.add("hidden");
  }

  // Score
  if (quizStatus !== "disqualified") scoreElem.textContent = score;

  // Submitted at
  submittedElem.textContent = submittedAt ? new Date(submittedAt).toLocaleString() : "N/A";

  // Duration
  if (createdAt && submittedAt) {
    const diffMs = new Date(submittedAt) - new Date(createdAt);
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    durationElem.textContent = `${minutes}m ${seconds}s`;
  } else {
    durationElem.textContent = "N/A";
  }

  // Clear only temporary answers (keep score and timestamps for display)
  localStorage.removeItem("answers");
});
