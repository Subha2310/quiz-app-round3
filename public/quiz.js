// ===== QUIZ.JS =====
document.addEventListener("DOMContentLoaded", () => {
  const participant = JSON.parse(localStorage.getItem("participant"));
  const quizForm = document.getElementById("quiz-form");
  const timerElem = document.getElementById("timer");

  if (!participant || !participant.id) {
    alert("❌ No participant info found. Redirecting to login.");
    window.location.href = "/";
    return;
  }

  const BASE_URL = window.location.origin; // Works locally and on Render
  let questions = [];
  let answers = {};
  let totalTime = 10 * 60; // 10 minutes
  let timerInterval;
  let quizEnded = false;

  // ===== Fetch questions =====
  async function fetchQuestions() {
    try {
      const res = await fetch(`${BASE_URL}/api/questions`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      questions = await res.json();
      renderQuestions();
      startTimer();
    } catch (err) {
      console.error("❌ Error fetching questions:", err);
      alert("Failed to load questions. Try refreshing.");
    }
  }

  // ===== Render questions =====
  function renderQuestions() {
    quizForm.innerHTML = ""; // Clear form first
    questions.forEach((q, index) => {
      const block = document.createElement("div");
      block.className = "question-block";
      block.innerHTML = `
        <h3>Q${index + 1}. ${q.question}</h3>
        <div class="options">
          ${q.options
            .map(
              (opt) => `
            <label class="option">
              <input type="radio" name="q${q.id}" value="${opt}" />
              ${opt}
            </label>
          `
            )
            .join("")}
        </div>
      `;
      quizForm.appendChild(block);
    });

    // Add submit bar at the end
    const submitBar = document.createElement("div");
    submitBar.className = "submit-bar";
    submitBar.innerHTML = `<button type="submit">Submit Quiz</button>`;
    quizForm.appendChild(submitBar);
  }

  // ===== Timer =====
  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      totalTime--;
      updateTimerDisplay();
      if (totalTime <= 0 && !quizEnded) {
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

  // ===== Capture answers =====
  quizForm.addEventListener("change", (e) => {
    if (e.target.name && e.target.value) {
      const qid = e.target.name.replace("q", "");
      answers[qid] = e.target.value;
    }
  });

  // ===== Tab Switch → Disqualify =====
  let tabSwitched = false;
  window.addEventListener("blur", () => {
    if (!tabSwitched && !quizEnded) {
      tabSwitched = true;
      quizEnded = true;
      alert("🚫 You switched tabs. You are disqualified!");
      disqualifyParticipant();
    }
  });

  // ===== Form submit =====
  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!quizEnded) {
      quizEnded = true;
      submitQuiz();
    }
  });

  // ===== Submit quiz =====
  async function submitQuiz(timeout = false) {
    try {
      const res = await fetch(`${BASE_URL}/api/submit`, {
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
        localStorage.setItem(
          "quizStatus",
          timeout ? "timeout" : "completed"
        );
      } else {
        localStorage.setItem("quizStatus", "disqualified");
      }
    } catch (err) {
      console.error("❌ Submit error:", err);
      localStorage.setItem("quizStatus", "disqualified");
    } finally {
      window.location.href = "/exit.html";
    }
  }

  // ===== Handle timeout =====
  function handleTimeout() {
    alert("⏰ Time’s up! Submitting your quiz automatically...");
    submitQuiz(true);
  }

  // ===== Disqualify (Tab Switch) =====
  async function disqualifyParticipant() {
    try {
      await fetch(`${BASE_URL}/api/disqualify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id }),
      });
      localStorage.setItem("quizStatus", "disqualified");
    } catch (err) {
      console.error("❌ Disqualify error:", err);
    } finally {
      window.location.href = "/exit.html";
    }
  }

  // ===== Start =====
  fetchQuestions();
});
