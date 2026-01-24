/* ======================
   IMPORTS
====================== */
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Client = require("./models/Client");
const Message = require("./models/Message");
const motherDashboardRoutes = require("./dashboard/motherDashboard");
// ======================
// ADMIN TOKEN
// ======================
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "mother-dashboard-secret";

// ======================
// MIDDLEWARE: ADMIN AUTH
// ======================
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Invalid admin token" });
  }
  next();
}
// ======================
// APP INIT
// ======================
const app = express();
app.use(cors());
app.use(express.json());

// ======================
// UTILITY: STORAGE USAGE
// ======================
async function getClientStorageUsage(clientId) {
  const messages = await Message.find({ clientId });
  const totalBytes = messages.reduce((acc, msg) => acc + (msg.size || 0), 0);
  return totalBytes / (1024 * 1024); // MB
}



// ======================
// CLIENT ENDPOINTS
// ======================

// Register client (public)
app.post("/client/register", async (req, res) => {
  const { name } = req.body;
  const clientId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  try {
    const client = new Client({
      clientId,
      name: name || "New Client",
      adminInfo: "",
      apiKey: "",      // Shared API key
      fallback: "Sorry, I don't understand.",
      storageLimitMB: 100,
      tokens: 0,
      domain: ""
    });
    await client.save();
    res.json({ clientId, name: client.name });
  } catch (err) {
    console.error("Client register error:", err);
    res.status(500).json({ error: "Failed to register client" });
  }
});

// ======================
// CHAT ENDPOINT
// ======================
app.post("/chat", async (req, res) => {
  const { message, clientId } = req.body;
  if (!clientId) return res.json({ reply: "Client ID missing" });
  if (!message || !message.trim()) return res.json({ reply: "No message received" });

  try {
    const client = await Client.findOne({ clientId });
    if (!client) return res.json({ reply: "Client not found" });

    const adminInfo = client.adminInfo || "";
    const fallback = client.fallback || "Sorry, I don't understand.";

    // Basic matching
    const stopWords = ["is","are","am","was","the","a","an","of","to","in","on","for","with","does","do","did","how","why","when"];
    const inputWords = message.toLowerCase().split(/\W+/).filter(w => w && !stopWords.includes(w));

    const sentences = adminInfo.split(/[.!?]/).map(s => s.trim()).filter(Boolean);
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

    // Save messages if under storage limit
    const usedMB = await getClientStorageUsage(clientId);
    const limitMB = client.storageLimitMB || 100;
    const canSaveHistory = usedMB < limitMB;

    if (canSaveHistory) {
      await Message.create({ clientId, role: "user", content: message, size: Buffer.byteLength(message, "utf8") });
      await Message.create({ clientId, role: "bot", content: reply, size: Buffer.byteLength(reply, "utf8") });
    }

    res.json({
      reply,
      meta: {
        historySaved: canSaveHistory,
        storageUsedMB: usedMB,
        storageLimitMB: limitMB,
        tokensRemaining: client.tokens // Include token balance
      }
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.json({ reply: "Server error. Please try again." });
  }
});

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => res.send("Chatbot backend running"));

// ======================
// DATABASE & SERVER
// ======================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log("Server running on port", PORT));
  })
  .catch(err => console.error("MongoDB connection failed:", err));
