const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// MongoDB (safe connection)
mongoose.connect(process.env.MONGO_URI || "")
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.log("MongoDB NOT connected (safe for now)");
  });

// Chat route
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ reply: "No message received" });
  }

  res.json({
    reply: `You said: ${message}`
  });
});

// Root test
app.get("/", (req, res) => {
  res.send("Chatbot backend running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
