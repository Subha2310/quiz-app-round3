// ===== quiz.js for Round 3 =====
document.addEventListener("DOMContentLoaded", () => {
  const participant = JSON.parse(localStorage.getItem("participant"));

  // ✅ Reset previous quiz data at the start
  localStorage.removeItem("createdAt");
  localStorage.removeItem("submittedAt");
  localStorage.removeItem("score");
  localStorage.removeItem("quizStatus");

  // Load saved answers if any
  let answers = JSON.parse(localStorage.getItem("answers")) || {};

  if (!participant || !participant.id) {
    alert("❌ No participant info found. Redirecting to login.");
    window.location.href = "/";
    return;
  }

  const quizForm = document.getElementById("quiz-form");
  const timerElem = document.getElementById("timer");

  let questions = [];
  let totalTime = 12 * 60; // 12 minutes
  let timerInterval;
  let quizEnded = false;
  let tabSwitched = false;
  let submitting = false;

  // ===== Fetch Round 3 Questions =====
  fetch("/api/questions_round3")
    .then(res => res.json())
    .then(data => {
      questions = data.map(q => ({
        id: q.id,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options)
      }));

      renderQuestionsRound3();

      // ✅ Set createdAt when quiz starts
      if (!localStorage.getItem("createdAt")) {
        localStorage.setItem("createdAt", new Date().toISOString());
      }

      startTimer();
    })
    .catch(err => {
      console.error("Error fetching questions:", err);
      alert("Failed to load questions. Refresh the page.");
    });

  // ===== Render Questions =====
  function renderQuestionsRound3() {
    const submitBar = quizForm.querySelector(".submit-bar");
    if (!submitBar) return;

    questions.forEach((q, idx) => {
      const block = document.createElement("div");
      block.className = "question-block";

      block.innerHTML = `
        <h3>Q${idx + 1}. ${q.question}</h3>
        <div class="options">
          ${q.options.map(opt => `
            <label class="option">
              <input type="radio" name="q${q.id}" value="${opt}" ${answers[q.id] === opt ? "checked" : ""}/> ${opt}
            </label>
          `).join("")}
        </div>
      `;

      quizForm.insertBefore(block, submitBar);
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
        handleTimeout();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    timerElem.textContent = `⏱ ${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  // ===== Capture Answers (real-time save) =====
  quizForm.addEventListener("change", (e) => {
    if (e.target.name && e.target.value) {
      const qid = parseInt(e.target.name.replace("q", ""));
      answers[qid] = e.target.value;
      localStorage.setItem("answers", JSON.stringify(answers));
    }
  });

  // ===== Submit Quiz =====
  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (submitting || quizEnded) return;

    if (Object.keys(answers).length < questions.length) {
      if (!confirm("Some questions are unanswered. Submit anyway?")) return;
    }

    submitting = true;
    quizEnded = true;
    submitQuiz(false);
  });

  // ===== Submit Quiz API =====
  async function submitQuiz(timeout = false) {
    try {
      const submitTime = new Date().toISOString();
      localStorage.setItem("submittedAt", submitTime);
      localStorage.setItem("quizStatus", timeout ? "timeout" : "completed");

      const res = await fetch("/api/submit_round3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          answers: Object.keys(answers).map(qid => ({
            questionId: parseInt(qid),
            answer: answers[qid]
          })),
          status: timeout ? "timeout" : "completed"
        }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("score", data.score);
        if (data.submitted_at) {
          localStorage.setItem("submittedAt", data.submitted_at);
        }
      } else {
        console.warn("Submission failed:", data.message);
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      submitting = false;
      quizEnded = true;
      redirectToExit();
    }
  }

  // ===== Handle Timeout =====
  function handleTimeout() {
    alert("⏰ Time's up! Submitting your quiz automatically...");
    submitQuiz(true);
  }

  // ===== Disqualification =====
  async function disqualifyParticipants_round3() {
    if (quizEnded || submitting) return;

    submitting = true;
    quizEnded = true;

    try {
      await fetch("/api/disqualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id })
      });
      localStorage.setItem("quizStatus", "disqualified");
      localStorage.setItem("submittedAt", new Date().toISOString());
    } catch (err) {
      console.error("Disqualify error:", err);
    } finally {
      redirectToExit();
    }
  }

  // ===== Handle Tab Switch / Window Blur =====
  function handleDisqualification() {
    if (!tabSwitched && !quizEnded && !submitting) {
      tabSwitched = true;
      alert("🚫 You switched tabs, minimized, or left the application. You are disqualified!");
      if (timerInterval) clearInterval(timerInterval);
      disqualifyParticipants_round3();
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) handleDisqualification();
  });

  window.addEventListener("blur", handleDisqualification);

  // ===== Redirect =====
  function redirectToExit() {
    window.location.href = "/exit.html";
  }
});
