const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// ====== MIDDLEWARE ======
app.use(cors()); // ✅ Enable CORS for all routes
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ====== CONFIG ======
const PORT = process.env.PORT || 5002;

// ====== DATABASE POOL ======
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // single URL with host, user, pass, db, port
  ssl: { rejectUnauthorized: false }          // required for Render Postgres
});

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
    const existing = await pool.query("SELECT * FROM participants WHERE id=$1", [id]);

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (["completed", "disqualified"].includes(user.status)) {
        return res.status(400).json({
          success: false,
          error: "This Participant ID has already completed or been disqualified.",
        });
      }
      return res.json({ success: true, participant: user });
    }

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

    if (participantQuery.rows.length === 0) return res.json({ exists: false });
    return res.json({ exists: true, status: participantQuery.rows[0].status });
  } catch (err) {
    console.error("❌ Error checking participant:", err);
    res.status(500).json({ exists: false, error: "Server error" });
  }
});

// ===== FETCH QUESTIONS =====
app.get("/api/questions", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, question, options FROM questions ORDER BY id");
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

// ===== SCORE CALCULATION =====
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
  const { participantId, answers } = req.body;
  if (!participantId || !answers)
    return res.status(400).json({ success: false, error: "Invalid access" });

  try {
    const userCheck = await pool.query("SELECT * FROM participants WHERE id=$1 AND status='active'", [participantId]);
    if (userCheck.rows.length === 0)
      return res.status(400).json({ success: false, error: "Participant already submitted or disqualified" });

    await calculateScore(participantId, answers, "completed");

    const result = await pool.query("SELECT score, created_at, submitted_at FROM participants WHERE id=$1", [participantId]);
    res.json(result.rows[0] ? { success: true, ...result.rows[0] } : { success: false });
  } catch (err) {
    console.error("❌ Submission failed:", err);
    res.status(500).json({ success: false, error: "Submission failed. Try again." });
  }
});

// ===== DISQUALIFY =====
app.post("/api/disqualify", async (req, res) => {
  const { participantId } = req.body;
  if (!participantId) return res.status(400).json({ success: false, error: "Participant ID missing" });

  try {
    const result = await pool.query(
      "UPDATE participants SET status='disqualified', submitted_at=NOW() WHERE id=$1 AND status='active' RETURNING *",
      [participantId]
    );

    if (result.rows.length === 0)
      return res.json({ success: false, message: "Participant already submitted or timed out" });

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
      `SELECT id, username, status, score, submitted_at, created_at
       FROM participants
       ORDER BY submitted_at DESC NULLS LAST, id ASC;`
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
