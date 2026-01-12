const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());              // ✅ ALLOW FRONTEND ACCESS
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Chatbot backend running");
});

// Chat route
app.post("/chat", async (req, res) => {
  const { message, clientId } = req.body;

  if (!message) {
    return res.json({ reply: "No message received" });
  }

  res.json({
    reply: `You said: ${message}`
  });
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo error:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
