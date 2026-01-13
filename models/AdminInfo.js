const mongoose = require("mongoose");

const adminInfoSchema = new mongoose.Schema({
  clientId: { type: String, required: true },

  infoText: { type: String, default: "" },
  fallbackText: { type: String, default: "Sorry, I don't understand." },

  botName: { type: String, default: "Chat Assistant" },

  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AdminInfo", adminInfoSchema);
