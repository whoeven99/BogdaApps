const fs = require('fs');
const path = require('path');

const filePath = 'D:/下载/LensFlow/dist/public/assets/index-BsEi1krw.js';

let content = fs.readFileSync(filePath, 'utf8');
console.log('Original length:', content.length);

// Count replacement characters
const replacementChar = '\uFFFD';
let count = (content.match(/\uFFFD/g) || []).length;
console.log('Replacement chars found:', count);

// Show some context around replacement chars
const idx = content.indexOf(replacementChar);
if (idx >= 0) {
  console.log('First found at:', idx);
  console.log('Context:', JSON.stringify(content.substring(Math.max(0, idx - 20), idx + 40)));
}