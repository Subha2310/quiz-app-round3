document.addEventListener("DOMContentLoaded", async () => {
  const participant = JSON.parse(localStorage.getItem("participant")) || {};
  if (!participant.id) return alert("❌ No participant info found");

  const quizForm = document.getElementById("quiz-form");
  const timerElem = document.getElementById("timer");

  // ===== FETCH QUESTIONS =====
  let questions = [];
  try {
    const res = await fetch("/api/questions");
    questions = await res.json();
  } catch (err) {
    console.error("Failed to fetch questions", err);
  }

  // ===== DISPLAY QUESTIONS =====
  questions.forEach((q, idx) => {
    const qBlock = document.createElement("div");
    qBlock.className = "question-block";
    qBlock.innerHTML = `
      <h3>${idx + 1}. ${q.question}</h3>
      <div class="options">
        ${q.options.map(opt => `
          <label class="option">
            <input type="radio" name="q${q.id}" value="${opt}" required /> ${opt}
          </label>
        `).join("")}
      </div>
    `;
    quizForm.insertBefore(qBlock, quizForm.querySelector(".submit-bar"));
  });

  // ===== TIMER =====
  let duration = 10 * 60; // 10 minutes
  const startTime = Date.now();
  localStorage.setItem("createdAt", new Date().toISOString());

  const timerInterval = setInterval(() => {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    timerElem.textContent = `⏱ ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    duration--;
    if (duration < 0) {
      clearInterval(timerInterval);
      submitQuiz("timeout");
    }
  }, 1000);

  // ===== FORM SUBMISSION =====
  quizForm.addEventListener("submit", e => {
    e.preventDefault();
    submitQuiz("completed");
  });

  async function submitQuiz(status) {
    clearInterval(timerInterval);
    const answers = {};
    questions.forEach(q => {
      const selected = quizForm.querySelector(`input[name="q${q.id}"]:checked`);
      if (selected) answers[q.id] = selected.value;
    });

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id, answers }),
      });
      const data = await res.json();

      if (data.success || status === "timeout") {
        localStorage.setItem("score", data.score || 0);
        localStorage.setItem("submittedAt", new Date().toISOString());
        localStorage.setItem("quizStatus", status);
        window.location.href = "/exit.html";
      } else {
        alert(data.error || "Submission failed");
      }
    } catch (err) {
      console.error("Submission error", err);
    }
  }

  // ===== TAB SWITCH DISQUALIFY =====
  window.addEventListener("blur", async () => {
    await fetch("/api/disqualify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: participant.id }),
    });
    localStorage.setItem("quizStatus", "disqualified");
    window.location.href = "/exit.html";
  });
});
