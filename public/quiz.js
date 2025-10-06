let participantId = localStorage.getItem("participantId");
let status = localStorage.getItem("quizStatus");

// 🚫 Block if not logged in OR already ended
if (!participantId || ["disqualified", "completed", "timeout"].includes(status)) {
  window.location.replace("/exit.html");
}

let isSubmitting = false; // prevent false disqualify on submit

// Load questions dynamically
async function loadQuestions() {
  try {
    let res = await fetch("/api/questions");
    let questions = await res.json();

    let form = document.getElementById("quiz-form");
    form.innerHTML = "";

    questions.forEach((q, idx) => {
      form.innerHTML += `
        <div>
          <p>${idx + 1}. ${q.question}</p>
          <input type="text" name="${q.id}" required>
        </div>
      `;
    });
  } catch (err) {
    console.error("Failed to load questions", err);
    document.getElementById("quiz-form").innerHTML =
      "<p>⚠️ Could not load questions. Please contact admin.</p>";
  }
}
loadQuestions();

// Timer (example: 60s)
let timeLeft = 60;
let timerElement = document.getElementById("timer");

let timer = setInterval(() => {
  if (timeLeft <= 0) {
    clearInterval(timer);
    alert("⏰ Time’s up! Auto-submitting quiz.");
    localStorage.setItem("quizStatus", "timeout");
    submitQuiz(true);  // auto-submit on timeout
  } else {
    timerElement.textContent = `Time left: ${timeLeft}s`;
    timeLeft--;
  }
}, 1000);

// Detect tab switch → disqualify
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !isSubmitting) {
    alert("⚠️ You switched tabs. Disqualified!");
    localStorage.setItem("quizStatus", "disqualified");
    localStorage.removeItem("quizScore");

    fetch("/api/disqualify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId })
    });

    window.location.replace("/exit.html");
  }
});

// Submit handler (manual submit)
document.getElementById("quiz-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await submitQuiz(false);
});

async function submitQuiz(autoSubmit = false) {
  clearInterval(timer);
  isSubmitting = true;  // ✅ avoid false disqualification

  const formData = new FormData(document.getElementById("quiz-form"));
  let answers = {};
  formData.forEach((value, key) => {
    answers[key] = value.trim();
  });

  try {
    let url = autoSubmit ? "/api/timeout" : "/api/submit"; // ✅ route based on case
    let res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, answers })
    });

    let data = await res.json();

    if (data.success) {
      if (autoSubmit) {
        localStorage.setItem("quizStatus", "timeout");
      } else {
        localStorage.setItem("quizStatus", "completed");
      }
    } else {
      localStorage.setItem("quizStatus", "disqualified");
    }
  } catch (err) {
    console.error("Submit error:", err);
    localStorage.setItem("quizStatus", "disqualified");
  }

  window.location.replace("/exit.html");
}
