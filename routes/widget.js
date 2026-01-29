const express = require("express");
const router = express.Router();
const Client = require("../models/Client");

/* ======================
   WIDGET CODE GENERATOR
====================== */
function generateWidgetCode(client) {
  return `<script>
(function(){
  const clientId = "${client.clientId}";
  const allowedDomain = "${client.domain || ""}";
  if (allowedDomain && !location.hostname.includes(allowedDomain)) return;

  const iframe = document.createElement("iframe");
iframe.src = "https://chatbot-backend-gjcv.onrender.com/widget-ui.html?clientId=" + clientId;
iframe.style.position = "fixed";
iframe.style.bottom = "20px";
iframe.style.right = "20px";
iframe.style.width = "360px";
iframe.style.height = "520px";
iframe.style.border = "none";
iframe.style.zIndex = "999999";

document.body.appendChild(iframe);
})();
</script>`;
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
        botName: 1,
        avatar: 1,
        fallback: 1
      }
    ).lean();

    if (!client) {
      return res.status(404).json({ error: "Invalid client" });
    }

    res.json(client);
  } catch (err) {
    console.error("Widget config error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================
   EXPORTS
====================== */
// Export the router for /config AND the generator function
module.exports = router;
module.exports.generateWidgetCode = generateWidgetCode;
