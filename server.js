const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.static(__dirname));
app.use(express.json());

app.post('/api/load-file', (req, res) => {
  const { filePath } = req.body;

  try {
    const absolutePath = path.resolve(filePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    res.json({ content, success: true });
  } catch (err) {
    res.status(400).json({ error: err.message, success: false });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Flashcard app running at http://localhost:${PORT}`);
});
