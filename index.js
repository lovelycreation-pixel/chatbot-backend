/* ======================
   IMPORTS
====================== */
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Client = require("./models/Client");
const Message = require("./models/Message");

// Default dev admin tokens (replace with env if needed)
const DEV_ADMIN_TOKENS = [
  process.env.ADMIN_TOKEN || "dev-admin-1",
  process.env.ADMIN_TOKEN_2 || "dev-admin-2",
  process.env.ADMIN_TOKEN_3 || "dev-admin-3"
];

// ======================
// MIDDLEWARE: ADMIN AUTH
// ======================
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || !DEV_ADMIN_TOKENS.includes(token)) {
    return res.status(401).json({ error: "Unauthorized" });
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
// Placeholder function
// ======================
async function getClientStorageUsage(clientId) {
  const messages = await Message.find({ clientId });
  const totalBytes = messages.reduce((acc, msg) => acc + (msg.size || 0), 0);
  return totalBytes / (1024 * 1024); // MB
}

// ======================
// DASHBOARD ROUTES
// ======================
app.get("/dashboard/clients", requireAdmin, async (req, res) => {
  try {
    const clients = await Client.find().lean();
    res.json(clients);
  } catch (err) {
    console.error("Dashboard clients error:", err);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

app.get("/dashboard/clients/:clientId", requireAdmin, async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.clientId }).lean();
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  } catch (err) {
    console.error("Dashboard client detail error:", err);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

app.post("/dashboard/clients/create", requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Client name required" });

  const clientId =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  try {
    const client = new Client({
      clientId,
      name,
      adminInfo: "",
      apiKey: "",
      fallback: "Sorry, I don't understand.",
      storageLimitMB: 100
    });

    await client.save();
    res.json({ clientId, name });
  } catch (err) {
    console.error("Create client error:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// ======================
// CLIENT ROUTES
// ======================
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
      storageLimitMB: 100
    });
    await client.save();
    res.json({ clientId, name: client.name });
  } catch (err) {
    console.error("Client register error:", err);
    res.status(500).json({ error: "Failed to register client" });
  }
});

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

    res.json({ reply, meta: { historySaved: canSaveHistory, storageUsedMB: usedMB, storageLimitMB: limitMB } });
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
