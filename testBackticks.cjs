const fs = require('fs');
const code = fs.readFileSync('src/data/defaultBooks.ts', 'utf8');
const lines = code.split('\n');

let inBacktick = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let chars = line.split('');
  for (let j = 0; j < chars.length; j++) {
    if (chars[j] === '`') {
      if (j > 0 && chars[j-1] === '\\') {
        continue;
      }
      inBacktick = !inBacktick;
      console.log(`Backtick found at line ${i + 1}, char ${j}. Now inside: ${inBacktick}. Context: ${line.substring(Math.max(0, j - 20), Math.min(line.length, j + 20))}`);
    }
  }
}
console.log('Final state: inside backtick =', inBacktick);


