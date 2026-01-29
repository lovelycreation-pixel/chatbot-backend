const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const Message = require("../models/Message");
const { generateWidgetCode } = require("../routes/widget");

function bytesToMB(bytes) {
  return +(bytes / (1024 * 1024)).toFixed(2);
}

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
  const client = await Client.findOne({ clientId }).lean();
  if (!client) return { usedMB: 0, messageCount: 0 };

  const messages = await Message.find({ clientId }).lean();

  const messageBytes = messages.reduce((a, m) => a + (m.size || 0), 0);
  const adminInfoBytes = Buffer.byteLength(client.adminInfo || "", "utf8");
  const botNameBytes = Buffer.byteLength(client.botName || "", "utf8");
  const avatarBytes = Buffer.byteLength(client.avatar || "", "utf8");
  const widgetBytes = Buffer.byteLength(client.widgetCode || "", "utf8");

  const totalBytes =
    messageBytes + adminInfoBytes + botNameBytes + avatarBytes + widgetBytes;

  return {
    usedMB: bytesToMB(totalBytes),
    messageCount: messages.length
  };
}

// ======================
// LIST ALL CLIENTS
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
          tokens: c.tokens || 0,
          widgetCode: c.widgetCode || "" // ✅ Include widgetCode here
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

  // ✅ Include widgetCode for the single client
  res.json({
    ...client,
    widgetCode: client.widgetCode || ""
  });
});

// ======================
// CREATE CLIENT
// ======================
const client = new Client({
  clientId,
  name,
  adminInfo: req.body.adminInfo || "",
  fallback: req.body.fallback || "Sorry, I don't understand.",
  storageLimitMB,
  tokens,
  domain,
  botName: req.body.botName || name, // set botName to client name initially
  avatar: req.body.avatar || ""
});
    // Generate widget code
    client.widgetCode = generateWidgetCode(client);

    await client.save();
    res.json(client);
  } catch (err) {
    console.error("Create client error:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// ======================
// UPDATE CLIENT
// ======================
router.patch("/clients/:clientId", requireAdmin, async (req, res) => {
  const allowedFields = [
    "name",
    "adminInfo",
    "fallback",
    "storageLimitMB",
    "tokens",
    "domain",
    "botName",
    "avatar"
  ];

  const updates = {};
  allowedFields.forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  try {
    const client = await Client.findOne({ clientId: req.params.clientId });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const currentUsage = await getUsage(client.clientId);
    const limitMB = client.storageLimitMB || 1024;

    let incomingBytes = 0;
    if (updates.adminInfo) incomingBytes += Buffer.byteLength(updates.adminInfo, "utf8");
    if (updates.name) incomingBytes += Buffer.byteLength(updates.name, "utf8");
    if (updates.avatar) incomingBytes += Buffer.byteLength(updates.avatar, "utf8");

    const incomingMB = incomingBytes / (1024 * 1024);

    if (currentUsage.usedMB + incomingMB > limitMB) {
      return res.status(400).json({
        error: "Storage limit exceeded",
        usedMB: currentUsage.usedMB,
        limitMB
      });
    }

    // ✅ APPLY UPDATES MANUALLY
    Object.assign(client, updates);

    // 🔥 REGENERATE WIDGET CODE (THIS WAS MISSING)
    client.widgetCode = generateWidgetCode(client);

    await client.save();

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
