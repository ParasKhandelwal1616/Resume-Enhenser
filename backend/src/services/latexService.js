const { exec } = require('child_process');
const path = require('path');
const fse = require('fs-extra');
const { promisify } = require('util');

const execAsync = promisify(exec);

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const OUTPUT_DIR = path.join(__dirname, '../../output');

/**
 * Compiles a LaTeX string to PDF.
 * @param {string} latexContent - Full .tex source
 * @param {string} jobId - Unique job ID for temp files
 * @param {string} filename - Output filename (without .pdf)
 * @returns {string} - Path to the generated PDF
 */
async function compile(latexContent, jobId, filename) {
  const workDir = path.join(UPLOADS_DIR, jobId);
  await fse.ensureDir(workDir);

  const texFile = path.join(workDir, 'resume.tex');
  const outputPdf = path.join(workDir, 'resume.pdf');
  const finalPdf = path.join(OUTPUT_DIR, `${filename}.pdf`);

  // Write the LaTeX source
  await fse.writeFile(texFile, latexContent, 'utf8');

  try {
    // Run pdflatex twice (needed for some templates to resolve references)
    const cmd = `pdflatex -interaction=nonstopmode -output-directory="${workDir}" "${texFile}"`;
    await execAsync(cmd, { timeout: 30000 });
    await execAsync(cmd, { timeout: 30000 }); // second pass

    if (!await fse.pathExists(outputPdf)) {
      throw new Error('PDF was not generated. Check LaTeX syntax.');
    }

    // Move to output directory with proper filename
    await fse.move(outputPdf, finalPdf, { overwrite: true });

    return finalPdf;
  } catch (err) {
    // Try to read the log file for a better error message
    const logFile = path.join(workDir, 'resume.log');
    let logSnippet = '';
    try {
      const log = await fse.readFile(logFile, 'utf8');
      // Extract the first error from the log
      const errorMatch = log.match(/^!.+$/m);
      if (errorMatch) logSnippet = errorMatch[0];
    } catch {}

    throw new Error(`LaTeX compilation failed. ${logSnippet || err.message}`);
  } finally {
    // Clean up temp work directory
    await fse.remove(workDir).catch(() => {});
  }
}

module.exports = { compile };
