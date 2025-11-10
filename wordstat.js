const fs = require("fs");
const path = require("path");
const { Worker } = require("worker_threads");

const args = process.argv.slice(2); // get args after "node wordstat.js"

function getArg(flag, defaultValue = null) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return defaultValue;
}

const FILE = getArg("--file", "corpus.txt");
const TOP_N = parseInt(getArg("--top", "10"));
const MIN_LEN = parseInt(getArg("--minLen", "1"));
const UNIQUE = args.includes("--unique");
const WORKERS = parseInt(getArg("--workers", "4"));
const OUT = "output/stats.json";

// split text into equal parts
function splitText(text, numParts) {
  const size = Math.ceil(text.length / numParts);
  const parts = [];
  for (let i = 0; i < text.length; i += size) {
    parts.push(text.slice(i, i + size));
  }
  return parts;
}

// run a worker thread
function runWorker(chunk, topN, minLen) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "worker.js"), {
      workerData: { text: chunk, topN, minLen },
    });
    worker.on("message", resolve);
    worker.on("error", reject);
  });
}

// merge results from workers
function mergeResults(results) {
  const totalCounts = {};
  let totalWords = 0;
  let longestWord = "";
  let shortestWord = null;

  for (const res of results) {
    totalWords += res.totalWords;
    for (const [word, count] of Object.entries(res.counts)) {
      totalCounts[word] = (totalCounts[word] || 0) + count;
    }

    if (res.longestWord.length > longestWord.length) longestWord = res.longestWord;
    if (!shortestWord || res.shortestWord.length < shortestWord.length)
      shortestWord = res.shortestWord;
  }

  // filter words by min length
  const filteredEntries = Object.entries(totalCounts).filter(([word]) => word.length >= MIN_LEN);

  const topWords = filteredEntries
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([word, count]) => ({ word, count }));

  return {
    totalWords,
    uniqueWords: Object.keys(totalCounts).length,
    longestWord,
    shortestWord,
    topWords: UNIQUE ? topWords.map((t) => t.word) : topWords,
  };
}

async function main() {
  console.log(`Reading file: ${FILE}`);
  const text = fs.readFileSync(FILE, "utf8");

  console.log(`Splitting into ${WORKERS} chunks...`);
  const chunks = splitText(text, WORKERS);

  console.log(`tarting ${WORKERS} workers...`);
  const start = Date.now();

  const results = await Promise.all(chunks.map((chunk) => runWorker(chunk, TOP_N, MIN_LEN)));

  const finalStats = mergeResults(results);
  const timeTaken = Date.now() - start;

  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ...finalStats, timeTaken }, null, 2));

  console.log(`Done in ${timeTaken} ms`);
  console.log(`Results saved to: ${OUT}`);
  console.table(finalStats.topWords);
}
main().catch(console.error);
