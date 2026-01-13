const stopWords = require("./stopWords");

function normalizeText(text) {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word && !stopWords.includes(word));
}

function splitSentences(text) {
  return text.split(/[.!?]/).map(s => s.trim()).filter(Boolean);
}

module.exports = {
  normalizeText,
  splitSentences
};
