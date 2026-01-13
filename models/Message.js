const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },

  role: {
    type: String,
    enum: ["user", "bot"],
    required: true
  },

  content: {
    type: String,
    required: true
  },

  size: {
    type: Number, // bytes
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Message", MessageSchema);
