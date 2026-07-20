const fs = require('fs');
const readline = require('readline');

async function searchLogs() {
  const fileStream = fs.createReadStream('/.aistudio/artifacts/brain/448df8a2-1f2e-415b-903c-9a60ed2587fb/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Searching logs...');
  let linesFound = 0;
  for await (const line of rl) {
    if (line.includes('defaultBooks.ts') && line.includes('japanese-survival')) {
      console.log(`Found a matching log entry! Length: ${line.length}`);
      // Print first 500 chars of the log entry to inspect
      console.log(line.substring(0, 500));
      linesFound++;
      if (linesFound > 5) break;
    }
  }
}

searchLogs();
