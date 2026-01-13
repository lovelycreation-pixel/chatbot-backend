const getBestMatch = require("./basicMatcher");

async function routeMessage({ message, client, adminInfo }) {
  const hasAI = client.apiKey && client.apiKey.trim() !== "";

  // Phase 1: AI redirects to BASIC
  return getBestMatch(
    message,
    adminInfo.infoText,
    adminInfo.fallbackText
  );
}

module.exports = routeMessage;
