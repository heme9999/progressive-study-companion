const fs = require('fs');
const content = fs.readFileSync('src/data/defaultBooks.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('title: "')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
