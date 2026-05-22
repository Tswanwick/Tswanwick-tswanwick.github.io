require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");


const app = express();
app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
}));
app.use(express.json());
app.use(express.static("public"));

// ─── MongoDB connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME         = "zone_dashboard";
const COLLECTION_NAME = "zone_dashboard";
console.log("MONGO_URI is:", process.env.MONGO_URI ? "SET" : "NOT SET");
let tasksCollection;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log("✅ Connected to MongoDB");
  const db = client.db(DB_NAME);
  tasksCollection = db.collection(COLLECTION_NAME);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET all tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await tasksCollection.find().sort({ createdAt: 1 }).toArray();
    // Map _id → id so the frontend doesn't need to change
    res.json(tasks.map(normalise));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a task
app.post("/tasks", async (req, res) => {
  try {
    const doc = {
      text:      req.body.text,
      completed: false,
      createdAt: new Date(),
    };
    const result = await tasksCollection.insertOne(doc);
    res.status(201).json(normalise({ ...doc, _id: result.insertedId }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle completion
app.patch("/tasks/:id", async (req, res) => {
  try {
    const _id = new ObjectId(req.params.id);

    // Fetch current state first so we can flip it
    const task = await tasksCollection.findOne({ _id });
    if (!task) return res.sendStatus(404);

    const updated = await tasksCollection.findOneAndUpdate(
      { _id },
      { $set: { completed: !task.completed } },
      { returnDocument: "after" }
    );

    res.json(normalise(updated));
  } catch (err) {
    // ObjectId cast error → treat as 404
    if (err.message.includes("ObjectId")) return res.sendStatus(404);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a task  (bonus — handy to have)
app.delete("/tasks/:id", async (req, res) => {
  try {
    const result = await tasksCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount === 0) return res.sendStatus(404);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert MongoDB doc to the shape the frontend expects ({ id, text, completed }) */
function normalise({ _id, text, completed }) {
  return { id: _id.toString(), text, completed };
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

connectDB()
  .then(() => {
    app.listen(3000, () =>
      console.log("✅ Server running at http://localhost:3000")
    );
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
