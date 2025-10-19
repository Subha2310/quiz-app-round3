// ===== exit.js =====
document.addEventListener("DOMContentLoaded", () => {
  const participant = JSON.parse(localStorage.getItem("participant")) || {};
  const score = localStorage.getItem(`score_${participant.id}`) || "0";
  const quizStatus = localStorage.getItem(`quizStatus_${participant.id}`);

  const nameElem = document.getElementById("name");
  const scoreElem = document.getElementById("score");
  const durationElem = document.getElementById("duration");
  const statusBox = document.getElementById("status-box");
  const scoreRow = document.getElementById("score-row");

  // ✅ Set participant name
  nameElem.textContent = participant.username || "Participant";

  // ✅ Status display
  statusBox.classList.remove("completed", "timeout", "disqualified");
  if (quizStatus === "completed") {
    statusBox.textContent = "✅ Completed Successfully";
    statusBox.classList.add("completed");
    scoreRow.classList.remove("hidden");
  } else if (quizStatus === "timeout") {
    statusBox.textContent = "⏰ Time Up";
    statusBox.classList.add("timeout");
    scoreRow.classList.remove("hidden");
  } else if (quizStatus === "disqualified") {
    statusBox.textContent = "🚫 Disqualified";
    statusBox.classList.add("disqualified");
    scoreRow.classList.add("hidden");
  } else {
    statusBox.textContent = "⚠️ Unknown Status";
    scoreRow.classList.add("hidden");
  }

  // ✅ Show score only if not disqualified
  if (quizStatus !== "disqualified") scoreElem.textContent = score;

  // ✅ Hide duration completely
  if (durationElem) durationElem.textContent = "-";

  // ✅ Clear temporary data
  localStorage.removeItem("answers");
});
