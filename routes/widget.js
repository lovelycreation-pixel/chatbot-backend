const express = require("express");
const router = express.Router();
const Client = require("../models/Client");

/**
 * PUBLIC
 * Used by widget.js
 */
router.get("/config/:clientId", async (req, res) => {
  const client = await Client.findOne(
    { clientId: req.params.clientId },
    {
      botName: 1,
      avatar: 1,
      fallback: 1
    }
  ).lean();

  if (!client) {
    return res.status(404).json({ error: "Invalid client" });
  }

  res.json(client);
});

module.exports = router;
