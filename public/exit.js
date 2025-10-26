// ===== Prevent going back to quiz page =====
window.history.pushState(null, "", window.location.href);
window.addEventListener("popstate", function () {
  window.location.replace("/"); // Redirect to index page
});
// ===== exit.js =====
document.addEventListener("DOMContentLoaded", () => {
  const participant = JSON.parse(localStorage.getItem("participant")) || {};
  const score = localStorage.getItem("score") || "0";
  const createdAtStr = localStorage.getItem("createdAt");
  const submittedAtStr = localStorage.getItem("submittedAt");
  const quizStatus = localStorage.getItem("quizStatus");

  const nameElem = document.getElementById("name");
  const scoreElem = document.getElementById("score");
  const submittedElem = document.getElementById("submittedAt");
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

  // ✅ Duration calculation (skip for disqualified)
  if (quizStatus !== "disqualified") {
    if (createdAtStr && submittedAtStr) {
      const createdAt = new Date(createdAtStr);
      const submittedAt = new Date(submittedAtStr);

      if (!isNaN(createdAt) && !isNaN(submittedAt)) {
        const diffMs = submittedAt - createdAt;
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        durationElem.textContent = `${minutes}m ${seconds}s`;
      } else {
        durationElem.textContent = "N/A";
      }
    } else {
      durationElem.textContent = "N/A";
    }
  } else {
    durationElem.textContent = "-";
  }

  // ✅ Update backend if participant was disqualified
  if (quizStatus === "disqualified" && participant?.id) {
    fetch("/api/disqualify_round3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: participant.id }),
    }).catch((err) => console.error("Disqualify update failed:", err));
  }

  // ✅ Clear temporary data
  localStorage.removeItem("answers");
});
