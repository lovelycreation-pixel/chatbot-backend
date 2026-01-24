const express = require("express");
const Client = require("../models/Client");
const Message = require("../models/Message");

const router = express.Router();

// ======================
// STORAGE CALCULATION
// ======================
async function getUsage(clientId) {
  const messages = await Message.find({ clientId }).lean();
  const bytes = messages.reduce((a, m) => a + (m.size || 0), 0);

  return {
    usedMB: +(bytes / (1024 * 1024)).toFixed(2),
    messageCount: messages.length
  };
}

// ======================
// LIST ALL CLIENTS (FOR MOTHER DASHBOARD)
// ======================
router.get("/clients", async (req, res) => {
  try {
    const clients = await Client.find().lean();

    const result = await Promise.all(
      clients.map(async (c) => {
        const usage = await getUsage(c.clientId);
        return {
          clientId: c.clientId,
          name: c.name,
          domain: c.domain || "",
          storageLimitMB: c.storageLimitMB || 100,
          storageUsedMB: usage.usedMB,
          messageCount: usage.messageCount,
          tokens: c.tokens || 0
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error("Mother dashboard list error:", err);
    res.status(500).json({ error: "Failed to load dashboard clients" });
  }
});

// ======================
// UPDATE CLIENT (EDIT POPUP)
// ======================
router.patch("/clients/:clientId", async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { clientId: req.params.clientId },
      { $set: req.body },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(client);
  } catch (err) {
    console.error("Update client error:", err);
    res.status(500).json({ error: "Failed to update client" });
  }
});

// ======================
// DELETE CLIENT
// ======================
router.delete("/clients/:clientId", async (req, res) => {
  try {
    await Client.deleteOne({ clientId: req.params.clientId });
    await Message.deleteMany({ clientId: req.params.clientId });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete client error:", err);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

module.exports = router;
