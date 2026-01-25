const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    unique: true
  },

  name: {
    type: String,
    default: "New Client"
  },

  adminInfo: {
    type: String,
    default: ""
  },

  apiKey: {
    type: String,
    default: ""
  },

  fallback: {
    type: String,
    default: "Sorry, I don't understand."
  },

  /* ===== Phase 5.1.1 additions ===== */

  retentionDays: {
    type: Number,
    default: 365 // 1 year
  },

  storageLimitMB: {
    type: Number,
    default: 1024 // 1 GB
  },

  avatar: {
    type: String,
    default: ""
  },

  botName: {
    type: String,
    default: "Chatbot"
  },

  widgetCode: {
    type: String,
    default: ""
  },

  widgetCode: {
  type: String,
  default: ""
},
botName: {
  type: String,
  default: "Chatbot"
},
avatar: {
  type: String,
  default: ""
},
retentionDays: {
  type: Number,
  default: 30
}
});

module.exports = mongoose.model("Client", ClientSchema);
