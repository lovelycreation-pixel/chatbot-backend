const Client = require("../models/Client");

/**
 * ROOT (Mother Dashboard) AUTH
 * Used ONLY for admin panel
 */
const requireRoot = (req, res, next) => {
  const token = req.headers["x-root-token"];

  if (!process.env.ROOT_TOKEN) {
    console.error("ROOT_TOKEN is not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  if (!token || token !== process.env.ROOT_TOKEN) {
    return res.status(403).json({ error: "Root access denied" });
  }

  next();
};

/**
 * CLIENT (Child Dashboard / Widget) AUTH
 */
const requireClient = async (req, res, next) => {
  try {
    const token = req.headers["x-client-token"];

    // Client ID should come from params FIRST
    const clientId =
      req.params.clientId ||
      req.query.clientId ||
      null;

    if (!token || !clientId) {
      return res.status(403).json({ error: "Client access denied" });
    }

    const client = await Client.findOne({ clientId }).lean();

    if (!client || client.clientToken !== token) {
      return res.status(403).json({ error: "Invalid client token" });
    }

    req.client = client;
    next();
  } catch (err) {
    console.error("Client auth error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

module.exports = {
  requireRoot,
  requireClient
};
