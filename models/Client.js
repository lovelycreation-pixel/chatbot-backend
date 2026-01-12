const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  clientId: { type: String, unique: true, required: true }, // unique for each client
  name: { type: String, default: "New Client" },
  adminInfo: { type: String, default: "" }, // all admin content
  apiKey: { type: String, default: "" }, // AI API key
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Client", clientSchema);
