module.exports = {
  requireRoot: (req, res, next) => {
    const token = req.headers["x-root-token"];
    if (!token || token !== process.env.ROOT_TOKEN) {
      return res.status(403).json({ error: "Root access denied" });
    }
    next();
  },

  requireClient: async (req, res, next) => {
    const token = req.headers["x-client-token"];
    const clientId = req.params.clientId || req.body.clientId;

    if (!token || !clientId) {
      return res.status(403).json({ error: "Client access denied" });
    }

    const Client = require("../models/Client");
    const client = await Client.findOne({ clientId });

    if (!client || client.clientToken !== token) {
      return res.status(403).json({ error: "Invalid client token" });
    }

    req.client = client;
    next();
  }
};
