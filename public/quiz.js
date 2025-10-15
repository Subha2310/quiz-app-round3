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

  let questions = [];
  let answers = {};
  let totalTime = 10 * 60; // 10 minutes in seconds
  let timerInterval;
  let quizEnded = false;

  // ===== Fetch questions =====
  fetch("/api/questions")
    .then((res) => res.json())
    .then((data) => {
      questions = data;
      renderQuestions();
      startTimer();
    })
    .catch((err) => {
      console.error("Error fetching questions:", err);
      alert("Failed to load questions. Try refreshing.");
    });

  // ===== Render questions =====
  function renderQuestions() {
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
      quizForm.insertBefore(block, quizForm.querySelector(".submit-bar"));
    });
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
    timerElem.textContent = `⏱ ${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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

  // ===== Submit quiz manually or normally =====
  async function submitQuiz(timeout = false) {
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
        localStorage.setItem(
          "quizStatus",
          timeout ? "timeout" : "completed"
        );
      } else {
        localStorage.setItem("quizStatus", "disqualified");
      }
    } catch (err) {
      console.error("Submit error:", err);
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
});
