// ===== quiz.js for Round 3 =====
document.addEventListener("DOMContentLoaded", () => {
  const participant = JSON.parse(localStorage.getItem("participant"));

  if (!participant || !participant.id) {
    alert("❌ No participant info found. Redirecting to login.");
    window.location.href = "/";
    return;
  }

  // ✅ Redirect to exit if Round 3 already submitted
  if (localStorage.getItem("round3SubmittedAt") && localStorage.getItem("round3QuizStatus")) {
    window.location.replace("/exit.html");
    return;
  }

  // ✅ Clear only temporary quiz data for a new attempt
  localStorage.removeItem("round3Answers");
  localStorage.removeItem("round3CreatedAt");
  localStorage.removeItem("round3Score");
  // Do NOT remove submittedAt or quizStatus for other rounds

  const quizForm = document.getElementById("quiz-form");
  const timerElem = document.getElementById("timer");

  let questions = [];
  let answers = {};
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
      if (!localStorage.getItem("round3CreatedAt")) {
        localStorage.setItem("round3CreatedAt", new Date().toISOString());
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
        <h3>Q${idx + 1}.</h3>
        <pre style="white-space: pre-wrap; font-family: 'Times New Roman', Times, serif;">${q.question}</pre>
        <div class="options">
          ${q.options.map((opt, i) => `
            <label class="option">
              <input type="radio" name="q${q.id}" value="${String.fromCharCode(97 + i)}" />
              <div style="white-space: pre-wrap; font-family: 'Times New Roman', Times, serif;">
                ${opt.replace(/\n/g, '<br>')}
              </div>
            </label>
          `).join('')}
        </div>
      `;

      quizForm.insertBefore(block, submitBar);
    });
  }

  // ===== Timer =====
  function startTimer() {
    updateTimerDisplay();
    window.timerInterval = setInterval(() => {
      if (quizEnded) return;
      totalTime--;
      updateTimerDisplay();
      if (totalTime <= 0) {
        clearInterval(window.timerInterval);
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
      const submitTime = new Date().toISOString();
      localStorage.setItem("round3SubmittedAt", submitTime);
      localStorage.setItem("round3QuizStatus", timeout ? "timeout" : "completed");

      const res = await fetch("/api/submit_round3", {
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
        localStorage.setItem("round3Score", data.score);
        if (data.submitted_at) {
          localStorage.setItem("round3SubmittedAt", data.submitted_at);
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
      localStorage.setItem("round3QuizStatus", "disqualified");
      localStorage.setItem("round3SubmittedAt", new Date().toISOString());
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
      if (window.timerInterval) clearInterval(window.timerInterval);
      disqualifyParticipants_round3();
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) handleDisqualification();
  });

  window.addEventListener("blur", handleDisqualification);

  // ===== Redirect =====
  function redirectToExit() {
    window.location.replace("/exit.html"); // Use replace to prevent going back
  }
});
