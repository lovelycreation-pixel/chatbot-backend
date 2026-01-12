const express = require("express");
const app = express();
app.use(express.json());
app.post("/chat", async (req, res) => {
  const { message, clientId } = req.body;

  if (!message) {
    return res.json({ reply: "No message received" });
  }

  // TEMP response (we will improve later)
  res.json({
    reply: `You said: ${message}`
  });
});
app.get("/", (req, res) => {
  res.send("Chatbot backend running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));
