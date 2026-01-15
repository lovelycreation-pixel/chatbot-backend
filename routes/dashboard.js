const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const Message = require("../models/Message");

/* ===============================
   ROOT: LIST ALL CLIENTS (SAFE LIST)
   =============================== */
router.get("/clients", async (req, res) => {
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

/* ===============================
   ROOT: CREATE NEW CLIENT
   =============================== */
router.post("/clients/create", async (req, res) => {
  const { name } = req.body;

  const clientId =
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);

  try {
    const clientToken =
  Math.random().toString(36).slice(2) +
  Math.random().toString(36).slice(2);

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

/* ===============================
   ROOT: FULL CLIENT DETAILS (ADMIN)
   =============================== */
router.get("/clients/:clientId", async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.clientId });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch client details" });
  }
});

/* ===============================
   ROOT: UPDATE CLIENT SETTINGS
   =============================== */
router.put("/clients/:clientId", async (req, res) => {
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

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(client);

  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

/* ===============================
   ROOT: GENERATE WIDGET EMBED CODE
   =============================== */
router.get("/clients/:clientId/widget", async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.clientId });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

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

/* ===============================
   ROOT: DELETE CLIENT
   =============================== */
router.delete("/clients/:clientId", async (req, res) => {
  const { clientId } = req.params;

  try {
    await Client.deleteOne({ clientId });
    await Message.deleteMany({ clientId });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ===============================
   ROOT: STORAGE USAGE (VISUAL READY)
=============================== */
router.get("/clients/:clientId/storage", async (req, res) => {
  const { clientId } = req.params;

  try {
    const result = await Message.aggregate([
      { $match: { clientId } },
      { $group: { _id: null, totalBytes: { $sum: "$size" } } }
    ]);

    const usedBytes = result[0]?.totalBytes || 0;
    const usedMB = +(usedBytes / (1024 * 1024)).toFixed(2);

    const client = await Client.findOne({ clientId });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

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

/* ===============================
   ROOT: VIEW CLIENT CHAT HISTORY
   =============================== */
router.get("/clients/:clientId/messages", async (req, res) => {
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

module.exports = router;
