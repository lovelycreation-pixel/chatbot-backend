/* ======================
   IMPORTS
====================== */
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const Client = require("./models/Client");
const Message = require("./models/Message");

const motherDashboardRoutes = require("./dashboard/motherDashboard");
const widgetRoutes = require("./routes/widget");

/* ======================
   APP INIT
====================== */
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (widget-ui.html, etc.)
app.use(express.static(path.join(__dirname, "public")));

/* ======================
   ADMIN TOKEN MIDDLEWARE
====================== */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "mother-dashboard-secret";
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Invalid admin token" });
  }
  next();
}

/* ======================
   ROUTES
====================== */
// Mother dashboard routes (admin-protected inside dashboard file)
app.use("/dashboard", motherDashboardRoutes);

// Widget routes (config + generator)
app.use("/widget", widgetRoutes);

/* ======================
   UTILITY: CLIENT STORAGE
====================== */
async function getClientStorageUsage(clientId) {
  const messages = await Message.find({ clientId }).lean();
  const totalBytes = messages.reduce((acc, msg) => acc + (msg.size || 0), 0);
  return {
    usedBytes: totalBytes,
    usedMB: totalBytes / (1024 * 1024)
  };
}

/* ======================
   CLIENT REGISTER (PUBLIC)
====================== */
app.post("/client/register", async (req, res) => {
  const { name } = req.body;
  const clientId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  try {
    const client = new Client({
      clientId,
      name: name || "New Client",
      adminInfo: "",
      apiKey: "",
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

/* ======================
   CHAT ENDPOINT
====================== */
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
    const { usedMB } = await getClientStorageUsage(clientId);
    const limitMB = client.storageLimitMB || 100;

    let historySaved = false;
    if (usedMB < limitMB) {
      const msg = new Message({ clientId, text: message, size: Buffer.byteLength(message, "utf8") });
      await msg.save();
      historySaved = true;
    }

    res.json({
      reply,
      meta: {
        historySaved,
        storageUsedMB: usedMB,
        storageLimitMB: limitMB,
        storageFull: !historySaved,
        tokensRemaining: client.tokens
      }
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.json({ reply: "Server error. Please try again." });
  }
});

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => res.send("Chatbot backend running"));

/* ======================
   DATABASE & SERVER START
====================== */
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chatbot";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("MongoDB connected");
  app.listen(PORT, () => console.log("Server running on port", PORT));
})
.catch(err => console.error("MongoDB connection failed:", err));
