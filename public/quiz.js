document.addEventListener("DOMContentLoaded", async () => {
  const participant = JSON.parse(localStorage.getItem("participant"));

  if (!participant || !participant.id) {
    alert("❌ No participant info found. Redirecting to registration page.");
    window.location.href = "index.html";
    return;
  }

  const quizContainer = document.getElementById("quiz-container");
  const quizForm = document.getElementById("quiz-form");
  const timerElem = document.getElementById("timer");

  let disqualified = false;
  let timeLeft = 600; // 10 minutes
  let questions = [];

  // ========= Fetch Questions =========
  try {
    const res = await fetch("/api/questions");
    if (!res.ok) throw new Error("Failed to load questions");
    questions = await res.json();

    if (!questions.length) {
      quizContainer.innerHTML = "<p>No questions found in database.</p>";
      return;
    }

    // Render questions
    quizContainer.innerHTML = questions
      .map(
        (q, i) => `
        <div class="question-card">
          <h3>Q${i + 1}. ${q.question}</h3>
          ${q.options
            .map(
              (opt) => `
              <label class="option-label">
                <input type="radio" name="q${q.id}" value="${opt}" required>
                ${opt}
              </label>
            `
            )
            .join("")}
        </div>
      `
      )
      .join("");
  } catch (err) {
    console.error("Error fetching questions:", err);
    quizContainer.innerHTML = "<p>⚠️ Error loading quiz questions.</p>";
    return;
  }

  // ========= Timer =========
  const timer = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timer);
      submitQuiz("timeout");
    } else {
      timeLeft--;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerElem.textContent = `⏱ ${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  }, 1000);

  // ========= Disqualify on Tab Switch =========
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !disqualified) {
      disqualified = true;
      clearInterval(timer);
      submitQuiz("disqualified");
    }
  });

  // ========= Submit Button =========
  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!disqualified) {
      clearInterval(timer);
      submitQuiz("completed");
    }
  });

  // ========= Submit Quiz Function =========
  async function submitQuiz(status) {
    const answersObj = {};
    questions.forEach((q) => {
      const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
      answersObj[q.id] = selected ? selected.value : null;
    });

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          answers: answersObj,
        }),
      });

      const data = await res.json();

      // Save result in localStorage for exit page
      localStorage.setItem("score", data.score || "0");
      localStorage.setItem("createdAt", data.created_at || new Date().toISOString());
      localStorage.setItem("submittedAt", data.submitted_at || new Date().toISOString());
      localStorage.setItem("quizStatus", status);

      window.location.href = "exit.html";
    } catch (err) {
      console.error("Error submitting quiz:", err);
      alert("⚠️ Submission failed. Please try again.");
    }
  }
});
