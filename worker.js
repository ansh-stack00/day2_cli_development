// worker.js
const { parentPort, workerData } = require("worker_threads");

function cleanWord(word) {
  return word.replace(/[^a-zA-Z']/g, "").toLowerCase();
}

function processText(text, topN = 10, minLen = 1) {
  const words = text.split(/\s+/);
  const counts = {};
  let total = 0;
  let longest = "";
  let shortest = null;

  for (let word of words) {
    word = cleanWord(word);
    if (!word || word.length < minLen) continue;

    total++;
    counts[word] = (counts[word] || 0) + 1;
    if (word.length > longest.length) longest = word;
    if (shortest === null || word.length < shortest.length) shortest = word;
  }

  return { totalWords: total, counts, longestWord: longest, shortestWord: shortest };
}

const result = processText(workerData.text, workerData.topN, workerData.minLen);
parentPort.postMessage(result);
