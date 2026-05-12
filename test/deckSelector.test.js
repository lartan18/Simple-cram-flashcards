const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function read(fileName) {
  return fs.readFileSync(path.join(rootDir, fileName), 'utf8');
}

test('index.html contains deck selector with Week 3/4/5 options', () => {
  const html = read('index.html');

  assert.match(html, /<select[^>]*id="deckSelect"[^>]*>/);
  assert.match(html, /<option value="\.\/week-3\.txt">Week 3<\/option>/);
  assert.match(html, /<option value="\.\/week-4\.txt">Week 4<\/option>/);
  assert.match(html, /<option value="\.\/week-5\.txt">Week 5<\/option>/);
});

test('app.js wires deck selector change to reloading selected file', () => {
  const js = read('app.js');

  assert.match(js, /const FILE_OPTIONS = \{[\s\S]*'Week 3': '\.\/week-3\.txt',[\s\S]*'Week 4': '\.\/week-4\.txt',[\s\S]*'Week 5': '\.\/week-5\.txt',[\s\S]*\};/);
  assert.match(js, /const DEFAULT_FILE_KEY = 'Week 3';/);
  assert.match(js, /deckSelect\.addEventListener\('change',\s*\(\)\s*=>\s*\{[\s\S]*loadFlashcards\(deckSelect\.value\);[\s\S]*\}\);/);
  assert.match(js, /document\.addEventListener\('DOMContentLoaded',\s*\(\)\s*=>\s*\{[\s\S]*deckSelect\.value = FILE_OPTIONS\[DEFAULT_FILE_KEY\];[\s\S]*loadFlashcards\(deckSelect\.value\);[\s\S]*\}\);/);
});
