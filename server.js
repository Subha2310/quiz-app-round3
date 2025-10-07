const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();

// ✅ Use Render's dynamic port or default to 3000 for local use
const PORT = process.env.PORT || 3000;

// ✅ PostgreSQL connection — use environment variables for Render
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "quizdb",
  password: process.env.DB_PASSWORD || "admin123",
  port: process.env.DB_PORT || 5432,
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= ROUTES =================

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// LOGIN → create participant
app.post("/api/login", async (req, res) => {
  const { name } = req.body;
  console.log("Login request received:", req.body);

  if (!name || name.trim() === "")
    return res.status(400).json({ success: false, error: "Name is required" });

  try {
    const existing = await pool.query("SELECT * FROM participants WHERE username=$1", [name]);
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (["completed", "disqualified", "timeout"].includes(user.status)) {
        return res.status(400).json({
          success: false,
          error: "You have already completed or been disqualified from the quiz.",
        });
      }
      return res.json({ success: true, participant: user });
    }

    const result = await pool.query(
      "INSERT INTO participants (username, status) VALUES ($1, 'active') RETURNING *",
      [name]
    );

    console.log("Participant inserted:", result.rows[0]);
    res.json({ success: true, participant: result.rows[0] });
  } catch (err) {
    console.error("Database error during login:", err);
    res.status(500).json({ success: false, error: "Login failed due to server error" });
  }
});

// GET questions
app.get("/api/questions", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, question FROM questions ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// SUBMIT answers
app.post("/api/submit", async (req, res) => {
  const { participantId, answers } = req.body;

  try {
    const correctAnswers = await pool.query("SELECT id, correct_answer FROM questions");
    let score = 0;
    correctAnswers.rows.forEach((q) => {
      if (answers[q.id] && answers[q.id].toLowerCase() === q.correct_answer.toLowerCase()) {
        score++;
      }
    });

    await pool.query(
      "UPDATE participants SET score=$1, status='completed', submitted_at=NOW() WHERE id=$2",
      [score, participantId]
    );

    res.json({ success: true, score });
  } catch (err) {
    console.error("Submission failed:", err);
    res.status(500).json({ success: false, error: "Submission failed" });
  }
});

// TIMEOUT
app.post("/api/timeout", async (req, res) => {
  const { participantId, answers } = req.body;

  try {
    const correctAnswers = await pool.query("SELECT id, correct_answer FROM questions");
    let score = 0;
    correctAnswers.rows.forEach((q) => {
      if (answers[q.id] && answers[q.id].toLowerCase() === q.correct_answer.toLowerCase()) {
        score++;
      }
    });

    await pool.query(
      "UPDATE participants SET score=$1, status='timeout', submitted_at=NOW() WHERE id=$2",
      [score, participantId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Timeout submission failed:", err);
    res.status(500).json({ success: false, error: "Timeout failed" });
  }
});

// DISQUALIFY
app.post("/api/disqualify", async (req, res) => {
  const { participantId } = req.body;

  try {
    await pool.query(
      "UPDATE participants SET status='disqualified', submitted_at=NOW() WHERE id=$1",
      [participantId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Disqualification failed:", err);
    res.status(500).json({ success: false, error: "Disqualification failed" });
  }
});

// ADMIN
app.get("/api/participants", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, status, score, submitted_at FROM participants ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching participants:", err);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
