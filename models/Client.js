const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },

  name: { type: String, default: "New Client" },
  adminInfo: { type: String, default: "" },
  apiKey: { type: String, default: "" },

  fallback: { type: String, default: "Sorry, I don't understand." },

  storageLimitMB: { type: Number, default: 1024 },
  tokens: { type: Number, default: 0 },

  domain: { type: String, default: "" },

  botName: { type: String, default: "Chatbot" },
  avatar: { type: String, default: "" },

  widgetCode: { type: String, default: "" },

  retentionDays: { type: Number, default: 365 }
});

module.exports = mongoose.model("Client", ClientSchema);
