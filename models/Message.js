const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  role: { type: String, enum: ["user", "bot"], required: true },
  content: { type: String, required: true },
  size: { type: Number, required: true }, // size in bytes
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date } // optional, used for retention rules
});

module.exports = mongoose.model("Message", messageSchema);
