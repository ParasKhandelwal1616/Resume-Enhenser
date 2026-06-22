const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const aiService = require('../services/aiService');
const latexService = require('../services/latexService');
const ocrService = require('../services/ocrService');

const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/customize', async (req, res) => {
  try {
    const { jobDescription, masterLatex, provider, apiKey, jobTitle, companyName } = req.body;

    if (!jobDescription || !masterLatex || !provider || !apiKey) {
      return res.status(400).json({ error: 'jobDescription, masterLatex, provider, and apiKey are required.' });
    }

    const { customizedLatex, atsScore, missingKeywords } = await aiService.customizeResume({
      jobDescription,
      masterLatex,
      provider,
      apiKey,
      jobTitle,
      companyName,
    });

    const jobId = uuidv4();

    // Filename: Paras_CompanyName_JobTitle_Resume
    const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
    const filename = `Paras_${sanitize(companyName)}_${sanitize(jobTitle)}_Resume`;

    const pdfPath = await latexService.compile(customizedLatex, jobId, filename);

    res.json({
      pdfUrl: `${req.protocol}://${req.get('host')}/output/${filename}.pdf`,
      customizedLatex,
      atsScore,
      missingKeywords,
      filename: `${filename}.pdf`,
    });
  } catch (err) {
    console.error('Customize error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/ocr', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No screenshot file uploaded.' });
    }
    const extractedText = await ocrService.extractText(req.file.path);
    res.json({ extractedText });
  } catch (err) {
    console.error('OCR error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/ats-score', async (req, res) => {
  try {
    const { latex, jobDescription, provider, apiKey } = req.body;
    if (!latex || !jobDescription || !provider || !apiKey) {
      return res.status(400).json({ error: 'latex, jobDescription, provider, and apiKey are required.' });
    }
    const result = await aiService.scoreResume({ latex, jobDescription, provider, apiKey });
    res.json(result);
  } catch (err) {
    console.error('ATS score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;