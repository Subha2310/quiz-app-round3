// ===== QUIZ.JS =====
document.addEventListener("DOMContentLoaded", () => {
  const participant = JSON.parse(localStorage.getItem("participant"));
  const quizForm = document.getElementById("quiz-form");
  const timerElem = document.getElementById("timer");

  if (!participant || !participant.id) {
    alert("❌ No participant info found. Redirecting to login...");
    window.location.href = "index.html";
    return;
  }

  let timeLeft = 60; // Set quiz duration in seconds
  let tabSwitchCount = 0;
  let timerInterval;

  // Start countdown timer
  function startTimer() {
    timerInterval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        submitQuiz(true); // Timeout
      } else {
        timerElem.textContent = `⏱️ Time Left: ${timeLeft}s`;
        timeLeft--;
      }
    }, 1000);
  }

  startTimer();

  // Detect tab switching
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      tabSwitchCount++;
      if (tabSwitchCount >= 1) {
        disqualifyParticipant();
      }
    }
  });

  // Submit event
  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitQuiz(false);
  });

  // ===== Submit quiz =====
  async function submitQuiz(timeout) {
    clearInterval(timerInterval);

    const formData = new FormData(quizForm);
    const answers = {};
    formData.forEach((value, key) => (answers[key] = value));

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          answers,
          timeout,
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("score", data.score);
        localStorage.setItem("createdAt", data.created_at);
        localStorage.setItem("submittedAt", data.submitted_at);

        if (timeout) {
          localStorage.setItem("quizStatus", "timeout");
          showStatusMessage("⏰ Time Up", "orange", true);
        } else {
          localStorage.setItem("quizStatus", "completed");
          showStatusMessage("✅ Completed Successfully", "green", true);
        }
      } else {
        localStorage.setItem("quizStatus", "disqualified");
        showStatusMessage("🚫 Disqualified", "red", false);
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      alert("❌ Failed to submit quiz.");
    }
  }

  // ===== Disqualify participant =====
  async function disqualifyParticipant() {
    clearInterval(timerInterval);

    try {
      await fetch("/api/disqualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id }),
      });

      localStorage.setItem("quizStatus", "disqualified");
      showStatusMessage("🚫 Disqualified", "red", false);
    } catch (err) {
      console.error("Error disqualifying participant:", err);
    }
  }

  // ===== Show status message =====
  function showStatusMessage(message, color, showScore) {
    document.body.innerHTML = `
      <div style="
        text-align:center;
        margin-top:100px;
        font-family: 'Poppins', sans-serif;
      ">
        <h2 style="color:${color}; font-size:28px;">${message}</h2>
        ${
          showScore
            ? `<p style="font-size:22px;">Your Score: <strong>${localStorage.getItem(
                "score"
              )}</strong></p>`
            : ""
        }
      </div>
    `;
  }
});
