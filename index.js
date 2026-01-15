/* ======================
   IMPORTS
====================== */
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Client = require("./models/Client");
const Message = require("./models/Message");

// Dashboard and client routes
const dashboardRoutes = require("./routes/dashboard");
const clientRoutes = require("./routes/client");

// Storage utility
const { getClientStorageUsage } = require("./utils/storage");

/* ======================
   APP INIT
====================== */
const app = express();
app.use(cors());
app.use(express.json());

/* ======================
   DASHBOARD & CLIENT ROUTES
====================== */
app.use("/dashboard", dashboardRoutes);
app.use("/client", clientRoutes);

/* ======================
   BASIC HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.send("Chatbot backend running");
});

/* ======================
   CHAT INTELLIGENCE (PHASE 2 + 5.3)
====================== */
app.post("/chat", async (req, res) => {
  const { message, clientId } = req.body;

  if (!clientId) return res.json({ reply: "Client ID missing" });
  if (!message || !message.trim()) return res.json({ reply: "No message received" });

  try {
    // Load client
    const client = await Client.findOne({ clientId });
    if (!client) return res.json({ reply: "Client not found" });

    const adminInfo = client.adminInfo || "";
    const apiKey = client.apiKey || ""; // AI switch prepared
    const fallback = client.fallback || "Sorry, I don't understand.";

    /* ======================
       STORAGE LIMIT CHECK
    ====================== */
    const usedMB = await getClientStorageUsage(clientId);
    const limitMB = client.storageLimitMB || 100;

    const canSaveHistory = usedMB < limitMB;

    /* ======================
       SAVE USER MESSAGE (if allowed)
    ====================== */
    if (canSaveHistory) {
      await Message.create({
        clientId,
        role: "user",
        content: message,
        size: Buffer.byteLength(message, "utf8")
      });
    }

    /* ======================
       BASIC MODE (NO AI YET)
    ====================== */
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
        if (sentence.toLowerCase().includes(word)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = sentence;
      }
    }

    const reply = bestScore > 0 ? bestMatch : fallback;

    /* ======================
       SAVE BOT MESSAGE (if allowed)
    ====================== */
    if (canSaveHistory) {
      await Message.create({
        clientId,
        role: "bot",
        content: reply,
        size: Buffer.byteLength(reply, "utf8")
      });
    }

    /* ======================
       FINAL RESPONSE
    ====================== */
    res.json({
      reply,
      meta: {
        historySaved: canSaveHistory,
        storageUsedMB: usedMB,
        storageLimitMB: limitMB
      }
    });

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
