// ===== server.js =====
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import bodyParser from "body-parser";
import cors from "cors";
import pkg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;


// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== Database Pool =====
const pool = new Pool({
  connectionString:"postgres://quizdb_ythj_user:ZSxMaEGmYb0SLuuYmoG6Rpo68MYpt2fD@dpg-d3igemali9vc73eqnafg-a.oregon-postgres.render.com:5432/quizdb_ythj",
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false } // ✅ for Render
    : false, // ✅ disable SSL locally
});

// ===== HOME =====
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// ===== LOGIN =====
app.post("/api/login", async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name)
    return res.status(400).json({ success: false, error: "ID and Name required" });

  try {
    const existing = await pool.query("SELECT * FROM participants WHERE id=$1", [id]);
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (["completed", "disqualified"].includes(user.status)) {
        return res
          .status(400)
          .json({ success: false, error: "Already completed/disqualified" });
      }
      return res.json({ success: true, participant: user });
    }

    const result = await pool.query(
      "INSERT INTO participants (id, username, status, score, created_at) VALUES ($1, $2, 'active', 0, NOW()) RETURNING *",
      [id, name]
    );
    res.json({ success: true, participant: result.rows[0] });
  } catch (err) {
    console.error("Login DB error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ===== CHECK PARTICIPANT =====
app.get("/api/check-participant/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, status FROM participants WHERE id=$1",
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
app.get("/api/questions", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, question, correct_answer, options FROM questions ORDER BY id ASC");
    const questions = result.rows.map(q => {
      let opts = [];
      try {
        opts = JSON.parse(q.options); // parse string to array
      } catch (err) {
        console.error(`❌ JSON parse error for question ID: ${q.id}`, err.message);
      }
      return {
        id: q.id,
        question: q.question,
        correct_answer: q.correct_answer,
        options: q.options
      };
    });
    res.json(questions);
  } catch (err) {
    console.error("❌ Fetch questions error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});


// ===== SCORE CALCULATION =====
async function calculateScore(participantId, answers, status) {
  try {
    // Ensure answers is an object
    let parsedAnswers = answers;
    if (typeof answers === "string") {
      try {
        parsedAnswers = JSON.parse(answers);
      } catch {
        console.warn("Invalid JSON answers, using empty object");
        parsedAnswers = {};
      }
    }

    // Get all questions from DB
    const questionRes = await pool.query("SELECT id, correct_answer FROM questions");
    const questionMap = new Map(questionRes.rows.map(q => [q.id, q.correct_answer.toLowerCase().trim()]));

    // Calculate score
    let score = 0;
    for (const [qid, ans] of Object.entries(parsedAnswers)) {
      const correct = questionMap.get(parseInt(qid));
      if (correct && ans.toLowerCase().trim() === correct) score++;
    }

    // Update participant record
    await pool.query(
      `UPDATE participants
       SET score = $2,
           status = $3,
           answers = $4::jsonb,
           submitted_at = NOW()
       WHERE id = $1 AND status = 'active'`,
      [participantId, score, status, parsedAnswers]
    );

    return score;
  } catch (err) {
    console.error("Score calculation error:", err);
    throw err;
  }
}


// ===== SUBMIT QUIZ =====
app.post("/api/submit", async (req, res) => {
  const { participantId, answers, status } = req.body;
  let parsedAnswers = answers;

  // Validate input
  if (!participantId || !answers || !status)
    return res.status(400).json({ success: false, error: "Invalid request" });

  // Parse answers if it came as JSON string
  if (typeof answers === "string") {
    try {
      parsedAnswers = JSON.parse(answers);
    } catch (err) {
      console.warn("Invalid JSON answers");
      parsedAnswers = {};
    }
  }

  try {
    // Ensure participant is active
    const userCheck = await pool.query(
      "SELECT * FROM participants WHERE id=$1 AND status='active'",
      [participantId]
    );
    if (!userCheck.rows.length)
      return res
        .status(400)
        .json({ success: false, error: "Already submitted or disqualified" });

    // Fetch correct answers from DB
    const questionsRes = await pool.query("SELECT id, correct_answer FROM questions");
    const questionMap = new Map(questionsRes.rows.map(q => [q.id, q.correct_answer]));

    // Calculate score
    let score = 0;
    for (const [qid, ans] of Object.entries(parsedAnswers)) {
      const correct = questionMap.get(parseInt(qid));
      if (correct && ans === correct) score++;
    }

    // Decide final status for DB
    const finalStatus =
      status === "timeout"
        ? "timeout"
        : status === "completed"
        ? "completed"
        : "disqualified";

    // Update participant record
    const updateRes = await pool.query(
      `UPDATE participants
       SET status=$1, score=$2, submitted_at=NOW()
       WHERE id=$3
       RETURNING score, created_at, submitted_at`,
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
app.post("/api/disqualify", async (req, res) => {
  const { participantId } = req.body;
  if (!participantId)
    return res.status(400).json({ success: false, error: "Missing participantId" });

  try {
    const result = await pool.query(
      "UPDATE participants SET status='disqualified', submitted_at=NOW() WHERE id=$1 AND status='active' RETURNING *",
      [participantId]
    );

    if (!result.rows.length)
      return res.json({ success: false, message: "Already submitted/disqualified" });

    res.json({ success: true, message: "Disqualified" });
  } catch (err) {
    console.error("Disqualify error:", err);
    res.status(500).json({ success: false, error: "Disqualification failed" });
  }
});

// ===== ADMIN DASHBOARD =====
app.get("/api/participants", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, status, score, created_at, submitted_at FROM participants ORDER BY submitted_at DESC NULLS LAST, id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch participants error:", err);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

// ===== Start Server =====
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));