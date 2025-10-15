const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();

// ====== CONFIG ======
const PORT = process.env.PORT || 5002;
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "quizdb_ythj",
  password: process.env.DB_PASSWORD || "admin123",
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : false,
});

// ====== MIDDLEWARE ======
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ====== ROUTES ======

// HOME PAGE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== LOGIN =====
app.post("/api/login", async (req, res) => {
  const { id, name } = req.body;

  if (!id || !name || name.trim() === "")
    return res.status(400).json({ success: false, error: "Participant ID and Name are required" });

  try {
    const existing = await pool.query(
      "SELECT * FROM participants WHERE id=$1",
      [id]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];

      // Block re-entry after completion/disqualification
      if (["completed", "disqualified"].includes(user.status)) {
        return res.status(400).json({
          success: false,
          error: "This Participant ID has already completed or been disqualified.",
        });
      }

      return res.json({ success: true, participant: user });
    }

    // Create a new participant with created_at timestamp
    const result = await pool.query(
      "INSERT INTO participants (id, username, status, score, created_at) VALUES ($1, $2, 'active', 0, NOW()) RETURNING *",
      [id, name]
    );
    res.json({ success: true, participant: result.rows[0] });
  } catch (err) {
    console.error("❌ Database error during login:", err);
    res.status(500).json({ success: false, error: "Login failed due to server error" });
  }
});

// ===== CHECK PARTICIPANT ID =====
app.get("/api/check-participant/:id", async (req, res) => {
  const participantId = req.params.id;

  try {
    const participantQuery = await pool.query(
      "SELECT id, status FROM participants WHERE id=$1",
      [participantId]
    );

    if (participantQuery.rows.length === 0) {
      return res.json({ exists: false });
    }

    const participant = participantQuery.rows[0];
    return res.json({ exists: true, status: participant.status });
  } catch (err) {
    console.error("❌ Error checking participant:", err);
    res.status(500).json({ exists: false, error: "Server error" });
  }
});

// ===== FETCH QUESTIONS =====
app.get("/api/questions", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, question, options FROM questions ORDER BY id"
    );

    // Shuffle options for each user
    const questions = result.rows.map((q) => ({
      id: q.id,
      question: q.question,
      options: [...q.options].sort(() => Math.random() - 0.5),
    }));

    res.json(questions);
  } catch (err) {
    console.error("❌ Error fetching questions:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// ===== SCORE CALCULATION (case-insensitive) =====
const calculateScore = async (participantId, answers, status) => {
  await pool.query(
    `
    UPDATE participants p
    SET score = sub.correct_count,
        status = $3,
        answers = $2,
        submitted_at = NOW()
    FROM (
      SELECT p.id, COUNT(*) AS correct_count
      FROM participants p
      CROSS JOIN LATERAL jsonb_each_text($2::jsonb) AS a(qid, ans)
      JOIN correct_answers c 
        ON c.question_id = a.qid::int 
        AND LOWER(TRIM(a.ans)) = LOWER(TRIM(c.answer))
      WHERE p.id = $1
      GROUP BY p.id
    ) AS sub
    WHERE p.id = $1;
  `,
    [participantId, answers, status]
  );
};

// ===== SUBMIT ANSWERS =====
app.post("/api/submit", async (req, res) => {
  const { participantId, answers, timeout } = req.body;

  if (!participantId || !answers) {
    return res.status(400).json({ success: false, error: "Invalid access" });
  }

  try {
    // Check if participant exists and is still active
    const userCheck = await pool.query(
      "SELECT * FROM participants WHERE id=$1 AND status='active'",
      [participantId]
    );

    if (userCheck.rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid access or already submitted" });
    }

    // Set status depending on timeout or manual submit
    const status = timeout ? "completed" : "completed"; // treat timeout as completed

    // Update participant record & calculate score
    await calculateScore(participantId, answers, status);

    // Retrieve score + timestamps for exit page
    const result = await pool.query(
      "SELECT score, created_at, submitted_at FROM participants WHERE id=$1",
      [participantId]
    );

    const { score, created_at, submitted_at } = result.rows[0];

    res.json({
      success: true,
      score,
      created_at,
      submitted_at,
    });
  } catch (err) {
    console.error("❌ Submission failed:", err);
    res
      .status(500)
      .json({ success: false, error: "Submission failed. Try again." });
  }
});

// ===== TIMEOUT =====
app.post("/api/timeout", async (req, res) => {
  const { participantId, answers } = req.body;

  if (!participantId) {
    return res.status(400).json({ success: false, error: "Invalid timeout" });
  }

  try {
    // Only process if participant is active
    const userCheck = await pool.query(
      "SELECT * FROM participants WHERE id=$1 AND status='active'",
      [participantId]
    );

    if (userCheck.rows.length === 0) {
      return res.json({ success: false, message: "Already submitted or disqualified" });
    }

    // Calculate score for answered questions and mark as completed
    await calculateScore(participantId, answers || {}, "completed");

    // Fetch updated info
    const result = await pool.query(
      "SELECT score, created_at, submitted_at FROM participants WHERE id=$1",
      [participantId]
    );

    res.json({
      success: true,
      score: result.rows[0].score,
      created_at: result.rows[0].created_at,
      submitted_at: result.rows[0].submitted_at,
    });
  } catch (err) {
    console.error("❌ Timeout submission failed:", err);
    res.status(500).json({ success: false, error: "Timeout failed" });
  }
});

// ===== DISQUALIFY =====
app.post("/api/disqualify", async (req, res) => {
  const { participantId } = req.body;
  if (!participantId)
    return res.status(400).json({ success: false, error: "Participant ID missing" });

  try {
    // Only disqualify if participant is still active
    const result = await pool.query(
      "UPDATE participants SET status='disqualified', submitted_at=NOW() WHERE id=$1 AND status='active' RETURNING *",
      [participantId]
    );

    if (result.rows.length === 0) {
      // Already submitted or timed out
      return res.json({ success: false, message: "Participant already submitted or timed out" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Disqualification failed:", err);
    res.status(500).json({ success: false, error: "Disqualification failed" });
  }
});

// ===== ADMIN DASHBOARD =====
app.get("/api/participants", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, username, status, score, submitted_at, created_at
      FROM participants
      ORDER BY submitted_at DESC NULLS LAST, id ASC;
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching participants:", err);
    res.status(500).json({ error: "Failed to fetch participants data" });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
