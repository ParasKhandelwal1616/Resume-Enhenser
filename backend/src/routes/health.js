const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');

router.get('/', (req, res) => {
  // Check if pdflatex is available
  let latexAvailable = false;
  try {
    execSync('pdflatex --version', { stdio: 'ignore' });
    latexAvailable = true;
  } catch {
    latexAvailable = false;
  }

  res.json({
    status: 'ok',
    latex: latexAvailable,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
