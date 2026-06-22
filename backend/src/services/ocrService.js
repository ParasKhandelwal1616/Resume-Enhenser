const Tesseract = require('tesseract.js');
const fse = require('fs-extra');

/**
 * Extracts text from an image file using Tesseract OCR.
 * @param {string} imagePath - Path to the uploaded image
 * @returns {string} - Extracted text
 */
async function extractText(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: () => {}, // suppress progress logs
    });

    // Clean up the uploaded file after OCR
    await fse.remove(imagePath).catch(() => {});

    return text.trim();
  } catch (err) {
    await fse.remove(imagePath).catch(() => {});
    throw new Error(`OCR failed: ${err.message}`);
  }
}

module.exports = { extractText };
