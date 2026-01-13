const express = require("express");
const Client = require("../models/Client");
const AdminInfo = require("../models/AdminInfo");
const routeMessage = require("../services/intelligenceRouter");

const router = express.Router();

router.post("/", async (req, res) => {
  const { message, clientId } = req.body;

  if (!message || !clientId) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const client = await Client.findOne({ clientId });
    if (!client) {
      return res.json({ reply: "Client not found." });
    }

    const adminInfo = await AdminInfo.findOne({ clientId }) || {
      infoText: "",
      fallbackText: "Sorry, I don't understand."
    };

    const reply = await routeMessage({
      message,
      client,
      adminInfo
    });

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
