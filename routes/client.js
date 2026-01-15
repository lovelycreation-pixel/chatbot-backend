const express = require("express");
const router = express.Router();

const Client = require("../models/Client");
const Message = require("../models/Message");
const { getClientStorageUsage } = require("../utils/storage");

/* =====================================
   CLIENT DASHBOARD — OVERVIEW
===================================== */
router.get("/overview", async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  try {
    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const usedMB = await getClientStorageUsage(clientId);
    const percentUsed = Math.min(
      100,
      +(usedMB / client.storageLimitMB * 100).toFixed(2)
    );

    res.json({
      clientId: client.clientId,
      name: client.name,
      storage: {
        usedMB,
        limitMB: client.storageLimitMB,
        percentUsed
      },
      retentionDays: client.retentionDays,
      hasApiKey: !!client.apiKey
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to load overview" });
  }
});

/* =====================================
   CLIENT DASHBOARD — UPDATE SETTINGS
   (ONLY SAFE FIELDS)
===================================== */
router.put("/settings", async (req, res) => {
  const { clientId, retentionDays, apiKey } = req.body;
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  try {
    const updates = {};
    if (retentionDays !== undefined) updates.retentionDays = retentionDays;
    if (apiKey !== undefined) updates.apiKey = apiKey;

    const client = await Client.findOneAndUpdate(
      { clientId },
      updates,
      { new: true }
    );

    if (!client) return res.status(404).json({ error: "Client not found" });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

/* =====================================
   CLIENT DASHBOARD — CLEAR CHAT HISTORY
===================================== */
router.post("/clear-history", async (req, res) => {
  const { clientId, mode, days } = req.body;
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  try {
    if (mode === "all") {
      await Message.deleteMany({ clientId });
    }

    if (mode === "olderThanDays") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days || 0));

      await Message.deleteMany({
        clientId,
        createdAt: { $lt: cutoff }
      });
    }

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

/* =====================================
   CLIENT DASHBOARD — GET WIDGET CODE
===================================== */
router.get("/widget", async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  try {
    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ error: "Client not found" });

    res.json({
      embedCode: `<script src="YOUR_WIDGET_URL.js" data-client-id="${clientId}"></script>`
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to generate widget" });
  }
});

/* =====================================
   CLIENT DASHBOARD — STORAGE STATUS
===================================== */
router.get("/storage", async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  try {
    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const usedMB = await getClientStorageUsage(clientId);
    const percent = usedMB / client.storageLimitMB;

    let status = "green";
    if (percent > 0.7) status = "yellow";
    if (percent > 0.9) status = "red";

    res.json({
      usedMB,
      limitMB: client.storageLimitMB,
      status
    });

  } catch (err) {
    res.status(500).json({ error: "Storage check failed" });
  }
});

module.exports = router;
