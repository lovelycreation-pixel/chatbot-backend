const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Client = require("./models/Client");

const app = express();

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json());

/* ======================
   BASIC HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.send("Chatbot backend running");
});

/* ======================
   CHAT INTELLIGENCE (PHASE 1)
====================== */
app.post("/chat", async (req, res) => {
  const { message, clientId } = req.body;

  // Safety checks
  if (!clientId) {
    return res.json({ reply: "Client ID missing" });
  }

  if (!message || !message.trim()) {
    return res.json({ reply: "No message received" });
  }

  try {
    // Load client
    const client = await Client.findOne({ clientId });
    if (!client) {
      return res.json({ reply: "Client not found" });
    }

    const adminInfo = client.adminInfo || "";
    const apiKey = client.apiKey || ""; // switch prepared (AI later)
    const fallback = client.fallback || "Sorry, I don't understand.";

    // BASIC MODE (no AI yet)
    const stopWords = [
      "is","are","am","was","the","a","an","of","to","in","on",
      "for","with","does","do","did","how","why","when"
    ];

    const inputWords = message
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w && !stopWords.includes(w));

    const sentences = adminInfo
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(Boolean);

    let bestMatch = "";
    let bestScore = 0;

    for (const sentence of sentences) {
      let score = 0;
      for (const word of inputWords) {
        if (sentence.toLowerCase().includes(word)) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = sentence;
      }
    }

    const reply = bestScore > 0 ? bestMatch : fallback;
    res.json({ reply });

  } catch (err) {
    console.error("Chat error:", err);
    res.json({ reply: "Server error. Please try again." });
  }
});

/* ======================
   CLIENT REGISTRATION
====================== */
app.post("/client/register", async (req, res) => {
  const { name } = req.body;

  const clientId =
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);

  try {
    const client = new Client({
      clientId,
      name: name || "New Client",
      adminInfo: "",
      apiKey: "",
      fallback: "Sorry, I don't understand."
    });

    await client.save();
    res.json({ clientId, name: client.name });

  } catch (err) {
    console.error("Client register error:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

/* ======================
   DATABASE + SERVER
====================== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log("Server running on port", PORT);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err);
  });
