const { normalizeText, splitSentences } = require("../utils/textUtils");

function getBestMatch(userMessage, adminInfo, fallback) {
  const userWords = normalizeText(userMessage);
  const sentences = splitSentences(adminInfo);

  let bestSentence = "";
  let highestScore = 0;

  for (const sentence of sentences) {
    let score = 0;
    const sentenceLower = sentence.toLowerCase();

    userWords.forEach(word => {
      if (sentenceLower.includes(word)) score++;
    });

    if (score > highestScore) {
      highestScore = score;
      bestSentence = sentence;
    }
  }

  return highestScore > 0 ? bestSentence : fallback;
}

module.exports = getBestMatch;
