// ===== quiz.js =====
document.addEventListener("DOMContentLoaded", () => {
  const participant = JSON.parse(localStorage.getItem("participant"));
  const quizForm = document.getElementById("quiz-form");
  const timerElem = document.getElementById("timer");

  if (!participant || !participant.id) {
    alert("❌ No participant info found. Redirecting to login.");
    window.location.href = "/";
    return;
  }

  // ===== LocalStorage keys per participant =====
  const createdAtKey = `createdAt_${participant.id}`;
  const submittedAtKey = `submittedAt_${participant.id}`;
  const scoreKey = `score_${participant.id}`;
  const statusKey = `quizStatus_${participant.id}`;

  let questions = [];
  let answers = {};
  let totalTime = 10 * 60; // 10 minutes
  let timerInterval;
  let quizEnded = false;
  let tabSwitched = false;
  let submitting = false;

  // ✅ Set createdAt for this participant only once per quiz attempt
  if (!localStorage.getItem(createdAtKey)) {
    localStorage.setItem(createdAtKey, new Date().toISOString());
    localStorage.removeItem(submittedAtKey);
    localStorage.removeItem(scoreKey);
    localStorage.removeItem(statusKey);
  }

  // ===== Fetch questions =====
  fetch("/api/questions")
    .then(res => res.json())
    .then(data => {
      questions = data.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options
      }));
      renderQuestions();
      startTimer();
    });

  function renderQuestions() {
    const submitBar = quizForm.querySelector(".submit-bar");
    if (!submitBar) return;

    questions.forEach((q, idx) => {
      const block = document.createElement("div");
      block.className = "question-block";
      block.innerHTML = `
        <h3>Q${idx + 1}. ${q.question}</h3>
        <div class="options">
          ${q.options.map(opt => `
            <label>
              <input type="radio" name="q${q.id}" value="${opt}" /> ${opt}
            </label>
          `).join("")}
        </div>
      `;
      quizForm.insertBefore(block, submitBar);
    });
  }

  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      if (quizEnded) return;
      totalTime--;
      updateTimerDisplay();
      if (totalTime <= 0) {
        clearInterval(timerInterval);
        handleTimeout();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    timerElem.textContent = `⏱ ${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  // ===== Submit Quiz =====
  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (submitting || quizEnded) return;

    submitting = true;
    quizEnded = true;
    submitQuiz(false);
  });

  async function submitQuiz(timeout = false) {
    try {
      // Record submission time immediately
      localStorage.setItem(submittedAtKey, new Date().toISOString());
      localStorage.setItem(statusKey, timeout ? "timeout" : "completed");

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id, answers, status: timeout ? "timeout" : "completed" })
      });

      const data = await res.json();
      if (data.success) localStorage.setItem(scoreKey, data.score);

      if (data.submitted_at) localStorage.setItem(submittedAtKey, data.submitted_at);
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      submitting = false;
      quizEnded = true;
      redirectToExit();
    }
  }

  function handleTimeout() {
    alert("⏰ Time's up! Submitting your quiz automatically...");
    submitQuiz(true);
  }

  function redirectToExit() {
    window.location.href = "/exit.html";
  }

  // ===== Disqualification =====
  async function disqualifyParticipant() {
    if (quizEnded || submitting) return;
    submitting = true;
    quizEnded = true;

    localStorage.setItem(submittedAtKey, new Date().toISOString());
    localStorage.setItem(statusKey, "disqualified");

    try {
      await fetch("/api/disqualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id })
      });
    } catch (err) {
      console.error("Disqualify error:", err);
    } finally {
      redirectToExit();
    }
  }

  function handleDisqualification() {
    if (!tabSwitched && !quizEnded && !submitting) {
      tabSwitched = true;
      if (timerInterval) clearInterval(timerInterval);
      alert("🚫 You switched tabs or minimized the window. You are disqualified!");
      disqualifyParticipant();
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) handleDisqualification();
  });

  window.addEventListener("blur", handleDisqualification);
});
