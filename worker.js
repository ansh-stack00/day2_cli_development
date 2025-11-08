const { parentPort, workerData } = require('worker_threads');

function cleanWord(word) {
  // removing punctuation and make lowercase
  return word.replace(/[^a-zA-Z']/g, '').toLowerCase();
}

function processText(text, topN = 10) {
  const words = text.split(/\s+/);
  const counts = {};

  let total = 0;
  let longest = '';
  let shortest = null;

  for (let word of words) {
    word = cleanWord(word);
    if (!word) continue;
    total++;
    counts[word] = (counts[word] || 0) + 1;

    if (word.length > longest.length) longest = word;
    if (shortest === null || word.length < shortest.length) shortest = word;
  }


  const unique = Object.keys(counts).length;

  const topWords = Object.entries(counts)
    .sort((a, b) => b[1] - a[1]) 
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));

  return {
    totalWords: total,
    uniqueWords: unique,
    longestWord: longest,
    shortestWord: shortest,
    topWords,
  };
}


const result = processText(workerData.text, workerData.topN || 10);
parentPort.postMessage(result);
