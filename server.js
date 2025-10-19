import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import bodyParser from "body-parser";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== DATABASE CONNECTION =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ===== HOME =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== LOGIN =====
app.post("/api/login_round2", async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name)
    return res.status(400).json({ success: false, error: "ID and Name required" });

  try {
    const existing = await pool.query(
      "SELECT * FROM participants_round2 WHERE id=$1",
      [id]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (["completed", "disqualified"].includes(user.status)) {
        return res.status(400).json({
          success: false,
          error: "Already completed/disqualified",
        });
      }
      return res.json({ success: true, participant: user });
    }

    const result = await pool.query(
      "INSERT INTO participants_round2 (id, username, status, score, created_at) VALUES ($1, $2, 'active', 0, NOW()) RETURNING *",
      [id, name]
    );

    res.json({ success: true, participant: result.rows[0] });
  } catch (err) {
    console.error("Login DB error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ===== CHECK PARTICIPANT =====
app.get("/api/check_participant_round2/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, status FROM participants_round2 WHERE id=$1",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.json({ exists: false });
    res.json({ exists: true, status: result.rows[0].status });
  } catch (err) {
    console.error("Check participant error:", err);
    res.status(500).json({ exists: false, error: "Server error" });
  }
});

// ===== FETCH QUESTIONS =====
app.get("/api/questions_round2", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, question, options, correct_answer FROM questions_round2 ORDER BY id ASC"
    );

    const questions = result.rows.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
    }));

    res.json(questions);
  } catch (err) {
    console.error("Fetch questions error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// ===== SUBMIT QUIZ =====
app.post("/api/submit_round2", async (req, res) => {
  const { participantId, answers, status } = req.body;
  if (!participantId || !answers || !status)
    return res.status(400).json({ success: false, error: "Invalid request" });

  let parsedAnswers = answers;
  if (typeof answers === "string") {
    try {
      parsedAnswers = JSON.parse(answers);
    } catch {
      parsedAnswers = {};
    }
  }

  try {
    const userCheck = await pool.query(
      "SELECT * FROM participants_round2 WHERE id=$1 AND status='active'",
      [participantId]
    );

    if (!userCheck.rows.length)
      return res
        .status(400)
        .json({ success: false, error: "Already submitted or disqualified" });

    const questionsRes = await pool.query(
      "SELECT id, correct_answer FROM questions_round2"
    );

    const questionMap = new Map(
      questionsRes.rows.map((q) => [q.id, q.correct_answer])
    );

    let score = 0;
    for (const [qid, ans] of Object.entries(parsedAnswers)) {
      const correct = questionMap.get(parseInt(qid));
      if (correct && ans === correct) score++;
    }

    const finalStatus =
      status === "timeout"
        ? "timeout"
        : status === "completed"
        ? "completed"
        : "disqualified";

    const updateRes = await pool.query(
      "UPDATE participants_round2 SET status=$1, score=$2, submitted_at=NOW() WHERE id=$3 RETURNING score, created_at, submitted_at",
      [finalStatus, score, participantId]
    );

    res.json({
      success: true,
      score: updateRes.rows[0].score,
      created_at: updateRes.rows[0].created_at,
      submitted_at: updateRes.rows[0].submitted_at,
      status: finalStatus,
    });
  } catch (err) {
    console.error("Submit quiz error:", err);
    res.status(500).json({ success: false, error: "Submission failed" });
  }
});

// ===== DISQUALIFY =====
app.post("/api/disqualify_round2", async (req, res) => {
  const { participantId } = req.body;
  if (!participantId)
    return res
      .status(400)
      .json({ success: false, error: "Missing participantId" });

  try {
    const result = await pool.query(
      "UPDATE participants_round2 SET status='disqualified', submitted_at=NOW() WHERE id=$1 AND status='active' RETURNING *",
      [participantId]
    );

    if (!result.rows.length)
      return res.json({
        success: false,
        message: "Already submitted/disqualified",
      });

    res.json({ success: true, message: "Disqualified" });
  } catch (err) {
    console.error("Disqualify error:", err);
    res.status(500).json({ success: false, error: "Disqualification failed" });
  }
});

// ===== ADMIN DASHBOARD =====
app.get("/api/participants_round2", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, status, score, created_at, submitted_at FROM participants_round2 ORDER BY submitted_at DESC NULLS LAST, id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch participants error:", err);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Round 2 server running on port ${PORT}`)
);
