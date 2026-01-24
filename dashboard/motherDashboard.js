const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const Message = require("../models/Message");

// ======================
// ADMIN AUTH
// ======================
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "mother-dashboard-secret";

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

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
// LIST ALL CLIENTS (MOTHER DASHBOARD)
// ======================
router.get("/clients", requireAdmin, async (req, res) => {
  try {
    const clients = await Client.find().lean();

    const result = await Promise.all(
      clients.map(async (c) => {
        const usage = await getUsage(c.clientId);
        return {
          clientId: c.clientId,
          name: c.name,
          domain: c.domain || "",
          adminInfo: c.adminInfo || "",
          fallback: c.fallback || "",
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
// GET SINGLE CLIENT
// ======================
router.get("/clients/:clientId", requireAdmin, async (req, res) => {
  const client = await Client.findOne({ clientId: req.params.clientId }).lean();
  if (!client) return res.status(404).json({ error: "Client not found" });
  res.json(client);
});

// ======================
// CREATE CLIENT
// ======================
router.post("/clients", requireAdmin, async (req, res) => {
  const { name, storageLimitMB = 100, tokens = 0, domain = "" } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Client name required" });
  }

  const clientId =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  try {
    const client = new Client({
      clientId,
      name,
      adminInfo: "",
      fallback: "Sorry, I don't understand.",
      storageLimitMB,
      tokens,
      domain
    });

    await client.save();
    res.json(client);
  } catch (err) {
    console.error("Create client error:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// ======================
// UPDATE CLIENT (EDIT POPUP)
// ======================
router.patch("/clients/:clientId", requireAdmin, async (req, res) => {
  const allowedFields = [
    "name",
    "adminInfo",
    "fallback",
    "storageLimitMB",
    "tokens",
    "domain"
  ];

  const updates = {};
  allowedFields.forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  try {
    const client = await Client.findOneAndUpdate(
      { clientId: req.params.clientId },
      { $set: updates },
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
router.delete("/clients/:clientId", requireAdmin, async (req, res) => {
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
