#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const testFile = path.join(__dirname, 'test', 'flashcardEngine.test.js');
const child = spawn('node', ['--test', testFile], {
  cwd: __dirname,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code);
});
