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

  let questions = [];
  let answers = {};
  let totalTime = 10 * 60; // 10 minutes
  let timerInterval;
  let quizEnded = false;
  let tabSwitched = false;
  let submitting = false;

  // ===== Fetch Questions =====
  fetch("/api/questions")
    .then(res => res.json())
    .then(data => {
      questions = data.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options   <- parse string to array
      }));
      renderQuestions();
      startTimer();
    })
    .catch(err => {
      console.error("Error fetching questions:", err);
      alert("Failed to load questions. Refresh the page.");
      console.log(data);
    });

  // ===== Render Questions =====
  function renderQuestions() {
    const submitBar = quizForm.querySelector(".submit-bar");
    if (!submitBar) return;

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
        quizEnded = true;
        handleTimeout();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    timerElem.textContent = `⏱ ${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  // ===== Capture Answers =====
  quizForm.addEventListener("change", (e) => {
    if (e.target.name && e.target.value) {
      const qid = e.target.name.replace("q", "");
      answers[qid] = e.target.value;
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
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          answers,
          status: timeout ? "timeout" : "completed"
        }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("score", data.score);
      }
      localStorage.setItem("quizStatus", timeout ? "timeout" : "completed");
      localStorage.setItem("submittedAt", data.submitted_at || new Date().toISOString());
    } catch (err) {
      console.error("Submit error:", err);
      localStorage.setItem("quizStatus", timeout ? "timeout" : "completed");
    } finally {
      submitting = false;
      quizEnded = true;
      redirectToExit();
    }
  }

  // ===== Quiz.js: Disqualification Logic =====
let tabSwitched = false;
let quizEnded = false;
let submitting = false;

// Redirect to exit page
function redirectToExit() {
  window.location.href = "/exit.html";
}

// ===== Disqualify Participant =====
async function disqualifyParticipant() {
  if (quizEnded || submitting) return;
  quizEnded = true;
  submitting = true;

  try {
    // Update backend
    await fetch("/api/disqualify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: participant.id }),
    });

    // Update localStorage
    localStorage.setItem("quizStatus", "disqualified");
    localStorage.setItem("submittedAt", new Date().toISOString());
  } catch (err) {
    console.error("Disqualify error:", err);
  } finally {
    // Redirect to exit page
    redirectToExit();
  }
}

// ===== Handle Tab Switch / Window Blur =====
function handleDisqualification() {
  if (!tabSwitched && !quizEnded && !submitting) {
    tabSwitched = true;
    quizEnded = true;

    alert("🚫 You switched tabs, minimized, or left the application. You are disqualified!");

    // Stop quiz timer
    if (window.timerInterval) clearInterval(window.timerInterval);

    // Call disqualify function
    disqualifyParticipant();
  }
}

// ===== Event Listeners =====
// Trigger when page is hidden (tab switch / minimize)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) handleDisqualification();
});

// Trigger when window loses focus (Alt+Tab, clicking outside)
window.addEventListener("blur", handleDisqualification);


  // ===== Handle Timeout =====
  function handleTimeout() {
    alert("⏰ Time's up! Submitting your quiz automatically...");
    submitQuiz(true);
  }

  // ===== Redirect to Exit Page =====
  function redirectToExit() {
    window.location.href = "/exit.html";
  }
});
