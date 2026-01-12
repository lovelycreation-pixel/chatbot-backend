const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Client = require("./models/Client"); // import the Client model
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

  if (!message) return res.json({ reply: "No message received" });

  try {
    // Find client info
    const client = await Client.findOne({ clientId });
    if (!client) return res.json({ reply: "Client not found" });

    const info = client.adminInfo || "";
    const apiKey = client.apiKey || "";

    // For now, basic response using your previous matching method
    const stopWords = ["is","are","am","was","the","a","an","of","to","in","on","for","with","does","do","did","how","why","when"];
    const inputWords = message.toLowerCase().split(/\W+/).filter(w => !stopWords.includes(w));
    const infoSentences = info.split(/[.!?]/).filter(Boolean);

    let best = "";
    let maxScore = 0;
    for (let sentence of infoSentences) {
      let score = 0;
      inputWords.forEach(w => { if(sentence.toLowerCase().includes(w)) score++; });
      if(score > maxScore) { maxScore = score; best = sentence.trim(); }
    }

    // Fallback if no match
    const reply = maxScore ? best : "Sorry, I don't understand.";
    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Server error. Please try again." });
  }
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo error:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
