const express = require("express");
const router = express.Router();
const Client = require("../models/Client");

/* ======================
   WIDGET CODE GENERATOR
====================== */
function generateWidgetCode(client) {
  const clientId = client.clientId || "";
  const domain = client.domain || "";
  const BASE_URL = "https://chatbot-backend-gjcv.onrender.com";

  return `
<script>
(function () {
  try {
    var allowedDomain = "${domain}";
    if (allowedDomain) {
      if (
        location.hostname !== allowedDomain &&
        !location.hostname.endsWith("." + allowedDomain)
      ) {
        return;
      }
    }

    if (document.getElementById("mother-chatbot-iframe")) return;

    var iframe = document.createElement("iframe");
    iframe.id = "mother-chatbot-iframe";
    iframe.src = "${BASE_URL}/widget-ui.html?clientId=${encodeURIComponent(
      clientId
    )}";
    iframe.style.position = "fixed";
    iframe.style.bottom = "20px";
    iframe.style.right = "20px";
    iframe.style.width = "360px";
    iframe.style.height = "520px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "12px";
    iframe.style.zIndex = "999999";
    iframe.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";

    document.body.appendChild(iframe);
  } catch (e) {
    console.error("Chatbot widget error", e);
  }
})();
</script>
`;
}

/* ======================
   READ-ONLY WIDGET CONFIG
====================== */
router.get("/config/:clientId", async (req, res) => {
  try {
    const client = await Client.findOne(
      { clientId: req.params.clientId },
      {
        clientId: 1,
        name: 1,
        botName: 1,
        avatar: 1,
        fallback: 1,
        domain: 1,
        tokens: 1
      }
    ).lean();

    if (!client) {
      return res.status(404).json({ error: "Invalid client" });
    }

    res.json({
      clientId: client.clientId,
      name: client.name || "",
      botName: client.botName || "",
      avatar: client.avatar || "",
      fallback: client.fallback || "",
      domain: client.domain || "",
      tokens: client.tokens || 0
    });
  } catch (err) {
    console.error("Widget config error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================
   EXPORTS
====================== */
module.exports = {
  router,
  generateWidgetCode
};
