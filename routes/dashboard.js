/* ===============================
   DASHBOARD ROUTES
=============================== */

// 1️⃣ Load environment variables
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-admin-secret";

// 2️⃣ Core imports
const express = require("express");
const router = express.Router();

// 3️⃣ Models
const Client = require("../models/Client");
const Message = require("../models/Message");

// 4️⃣ Middleware (custom auth)
const { requireRoot } = require("../middleware/auth");

// 5️⃣ ADMIN AUTH MIDDLEWARE
router.use((req, res, next) => {
  const token = req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

/* ===============================
   ROUTES START
=============================== */

// 0️⃣ Test route
router.get("/test", (req, res) => {
  res.json({ ok: true });
});

// 1️⃣ List all clients (safe list)
router.get("/clients", requireRoot, async (req, res) => {
  try {
    const clients = await Client.find({}, {
      clientId: 1,
      name: 1,
      storageLimitMB: 1,
      retentionDays: 1,
      apiKey: 1
    });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: "Failed to load clients" });
  }
});

// 2️⃣ Create new client
router.post("/clients/create", requireRoot, async (req, res) => {
  const { name } = req.body;

  const clientId =
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);

  const clientToken =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2);

  try {
    const client = new Client({
      clientId,
      name: name || "New Client",
      clientToken
    });

    await client.save();

    res.json({
      clientId,
      name: client.name
    });
  } catch (err) {
    res.status(500).json({ error: "Client creation failed" });
  }
});

// 3️⃣ Full client details (admin only)
router.get("/clients/:clientId", requireRoot, async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.clientId });

    if (!client) return res.status(404).json({ error: "Client not found" });

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch client details" });
  }
});

// 4️⃣ Update client settings
router.put("/clients/:clientId", requireRoot, async (req, res) => {
  const { clientId } = req.params;
  const updates = req.body;

  try {
    const client = await Client.findOneAndUpdate(
      { clientId },
      {
        name: updates.name,
        retentionDays: updates.retentionDays,
        storageLimitMB: updates.storageLimitMB,
        assistantName: updates.assistantName,
        assistantAvatar: updates.assistantAvatar,
        apiKey: updates.apiKey
      },
      { new: true }
    );

    if (!client) return res.status(404).json({ error: "Client not found" });

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// 5️⃣ Generate widget embed code
router.get("/clients/:clientId/widget", requireRoot, async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.clientId });

    if (!client) return res.status(404).json({ error: "Client not found" });

    const widgetCode = `
<!-- AI Chatbot Widget -->
<script>
  window.ChatbotConfig = {
    clientId: "${client.clientId}",
    apiUrl: "https://YOUR_BACKEND_URL/chat"
  };
</script>
<script src="https://YOUR_BACKEND_URL/widget.js" defer></script>
`;

    res.json({ widgetCode });
  } catch (err) {
    res.status(500).json({ error: "Widget generation failed" });
  }
});

// 6️⃣ Delete client
router.delete("/clients/:clientId", requireRoot, async (req, res) => {
  const { clientId } = req.params;

  try {
    await Client.deleteOne({ clientId });
    await Message.deleteMany({ clientId });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// 7️⃣ Storage usage (visualization ready)
router.get("/clients/:clientId/storage", requireRoot, async (req, res) => {
  const { clientId } = req.params;

  try {
    const result = await Message.aggregate([
      { $match: { clientId } },
      { $group: { _id: null, totalBytes: { $sum: "$size" } } }
    ]);

    const usedBytes = result[0]?.totalBytes || 0;
    const usedMB = +(usedBytes / (1024 * 1024)).toFixed(2);

    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const limitMB = client.storageLimitMB || 100;
    const remainingMB = +(limitMB - usedMB).toFixed(2);
    const usedPercent = +((usedMB / limitMB) * 100).toFixed(1);

    let status = "green";
    if (usedPercent >= 80) status = "warning";
    if (usedPercent >= 100) status = "danger";

    res.json({
      clientId,
      usedMB,
      limitMB,
      remainingMB,
      usedPercent,
      status,
      historyPaused: usedMB >= limitMB
    });
  } catch (err) {
    res.status(500).json({ error: "Storage calculation failed" });
  }
});

// 8️⃣ View client chat history
router.get("/clients/:clientId/messages", requireRoot, async (req, res) => {
  const { clientId } = req.params;

  try {
    const messages = await Message.find({ clientId })
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

/* ===============================
   EXPORT ROUTER
=============================== */
module.exports = router;
