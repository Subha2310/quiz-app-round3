// ===== quiz1.js =====
document.addEventListener("DOMContentLoaded", () => {
  const participant = JSON.parse(localStorage.getItem("participant"));
  const quizForm = document.getElementById("quiz-form");
  const timerElem = document.getElementById("timer");

  if (!participant || !participant.id) {
    alert("❌ No participant info found. Redirecting to login.");
    window.location.href = "/";
    return;
  }

  let questions = [];
  let answers = {};
  let totalTime = 10 * 60; // 7 minutes
  let timerInterval;
  let quizEnded = false;
  let tabSwitched = false;
  let submitting = false;

  // ===== Fetch Questions =====
  fetch("/api/questions")
    .then(res => res.json())
    .then(data => {
      questions = data;
      renderQuestions();
      startTimer();
    })
    .catch(err => {
      console.error("Error fetching questions:", err);
      alert("Failed to load questions. Refresh the page.");
    });

  // ===== Render Questions =====
  function renderQuestions() {
    questions.forEach((q, idx) => {
      const block = document.createElement("div");
      block.className = "question-block";
      block.innerHTML = `
        <h3>Q${idx + 1}. ${q.question}</h3>
        <div class="options">
          ${q.options
            .map(opt => `
              <label class="option">
                <input type="radio" name="q${q.id}" value="${opt}" /> ${opt}
              </label>
            `).join("")}
        </div>
      `;
      quizForm.insertBefore(block, quizForm.querySelector(".submit-bar"));
    });
  }

  // ===== Timer =====
  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      if (quizEnded) return;
      totalTime--;
      updateTimerDisplay();
      if (totalTime <= 0) {
        clearInterval(timerInterval);
        quizEnded = true;
        handleTimeout();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    timerElem.textContent = `⏱ ${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  // ===== Capture Answers =====
  quizForm.addEventListener("change", (e) => {
    if (e.target.name && e.target.value) {
      const qid = e.target.name.replace("q", "");
      answers[qid] = e.target.value;
    }
  });

  // ===== Tab Switch → Disqualify =====
  window.addEventListener("blur", () => {
    if (!tabSwitched && !quizEnded && !submitting) {
      tabSwitched = true;
      quizEnded = true;
      alert("🚫 You switched tabs. You are disqualified!");
      disqualifyParticipant();
    }
  });

  // ===== Submit Quiz =====
  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (submitting) return; // prevent multiple clicks
    submitting = true;
    submitQuiz(false);
  });

  async function submitQuiz(timeout = false) {
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          answers,
          status: timeout ? "timeout" : "completed",
        }),
      });
      const data = await res.json();

      if (data.success) {
        // Store all data for exit page
        localStorage.setItem("score", data.score);
        localStorage.setItem("quizStatus", timeout ? "timeout" : "completed");
        localStorage.setItem("createdAt", data.created_at);
        localStorage.setItem("submittedAt", data.submitted_at);
      } else {
        // If server rejects submission (already submitted/disqualified)
        localStorage.setItem("quizStatus", "disqualified");
      }
    } catch (err) {
      console.error("Submit error:", err);
      localStorage.setItem("quizStatus", "disqualified");
    } finally {
      quizEnded = true;
      window.location.href = "/exit.html";
    }
  }

  // ===== Disqualify Participant =====
  async function disqualifyParticipant() {
    try {
      await fetch("/api/disqualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id }),
      });
      localStorage.setItem("quizStatus", "disqualified");
    } catch (err) {
      console.error("Disqualify error:", err);
    } finally {
      window.location.href = "/exit.html";
    }
  }

  // ===== Handle Timeout =====
  function handleTimeout() {
    alert("⏰ Time's up! Submitting your quiz automatically...");
    submitQuiz(true);
  }
});
