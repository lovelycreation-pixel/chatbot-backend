const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const Message = require("../models/Message");

/* ===============================
   ROOT: LIST ALL CLIENTS
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
    const client = new Client({
      clientId,
      name: name || "New Client"
    });

    await client.save();

    res.json({
      clientId,
      name: client.name,
      embedCode: `<script src="YOUR_WIDGET_URL.js" data-client-id="${clientId}"></script>`
    });

  } catch (err) {
    res.status(500).json({ error: "Client creation failed" });
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
      updates,
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
   ROOT: STORAGE USAGE PER CLIENT
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

    res.json({
      usedMB,
      limitMB: client.storageLimitMB
    });

  } catch (err) {
    res.status(500).json({ error: "Storage check failed" });
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
