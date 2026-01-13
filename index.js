const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const Client = require("./models/Client");
const Message = require("./models/Message");

const app = express();

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json());

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.send("Chatbot backend running");
});

/* ======================
   CHAT INTELLIGENCE
   Phase 1 + Phase 2.2
====================== */
app.post("/chat", async (req, res) => {
  const { message, clientId } = req.body;

  /* ---- Safety checks ---- */
  if (!clientId) {
    return res.json({ reply: "Client ID missing" });
  }

  if (!message || !message.trim()) {
    return res.json({ reply: "No message received" });
  }

  try {
    /* ---- Load client ---- */
    const client = await Client.findOne({ clientId });
    if (!client) {
      return res.json({ reply: "Client not found" });
    }

    /* ---- Save USER message ---- */
    await Message.create({
      clientId,
      role: "user",
      content: message,
      size: Buffer.byteLength(message, "utf8")
    });

    const adminInfo = client.adminInfo || "";
    const apiKey = client.apiKey || ""; // AI switch ready (later)
    const fallback = client.fallback || "Sorry, I don't understand.";

    /* ---- BASIC MATCHING MODE ---- */
    const stopWords = [
      "is","are","am","was","the","a","an","of","to","in","on",
      "for","with","does","do","did","how","why","when"
    ];

    const inputWords = message
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w && !stopWords.includes(w));

    const sentences = adminInfo.split(/[.!?]/);

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
        bestMatch = sentence.trim();
      }
    }

    const reply = bestScore > 0 ? bestMatch : fallback;

    /* ---- Save BOT reply ---- */
    await Message.create({
      clientId,
      role: "bot",
      content: reply,
      size: Buffer.byteLength(reply, "utf8")
    });

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
mongoose
  .connect(process.env.MONGO_URI)
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
