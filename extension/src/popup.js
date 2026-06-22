const api = typeof browser !== "undefined" ? browser : chrome;
/**
 * Popup script — handles all UI logic.
 * Views: main, result, settings, latexView
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────
const views = {
  main: document.getElementById('mainView'),
  result: document.getElementById('resultView'),
  settings: document.getElementById('settingsView'),
  latex: document.getElementById('latexView'),
};

const jdDot = document.getElementById('jdDot');
const jdLabel = document.getElementById('jdLabel');
const jobMeta = document.getElementById('jobMeta');
const metaTitle = document.getElementById('metaTitle');
const metaCompany = document.getElementById('metaCompany');
const customizeBtn = document.getElementById('customizeBtn');
const screenshotInput = document.getElementById('screenshotInput');
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');

const scoreNumber = document.getElementById('scoreNumber');
const missingKws = document.getElementById('missingKws');
const kwChips = document.getElementById('kwChips');
const downloadBtn = document.getElementById('downloadBtn');
const viewLatexBtn = document.getElementById('viewLatexBtn');
const backBtn = document.getElementById('backBtn');

const providerSelect = document.getElementById('providerSelect');
const apiKeyInput = document.getElementById('apiKeyInput');
const backendUrlInput = document.getElementById('backendUrlInput');
const latexInput = document.getElementById('latexInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const saveMsg = document.getElementById('saveMsg');
const latexOutput = document.getElementById('latexOutput');
const copyLatexBtn = document.getElementById('copyLatexBtn');

// ── State ─────────────────────────────────────────────────────────────────────
let currentJD = null;
let lastResult = null;
let settings = {};

// ── View management ───────────────────────────────────────────────────────────
function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    el.style.display = key === name ? 'block' : 'none';
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────
async function loadSettings() {
  const stored = await api.storage.local.get(['provider', 'apiKey', 'backendUrl', 'masterLatex']);
  settings = stored;
  providerSelect.value = stored.provider || 'anthropic';
  apiKeyInput.value = stored.apiKey || '';
  backendUrlInput.value = stored.backendUrl || '';
  latexInput.value = stored.masterLatex || '';
}

saveSettingsBtn.addEventListener('click', async () => {
  settings = {
    provider: providerSelect.value,
    apiKey: apiKeyInput.value.trim(),
    backendUrl: backendUrlInput.value.trim().replace(/\/$/, ''),
    masterLatex: latexInput.value.trim(),
  };
  await api.storage.local.set(settings);
  saveMsg.style.display = 'block';
  setTimeout(() => { saveMsg.style.display = 'none'; }, 2000);
});

document.getElementById('settingsBtn').addEventListener('click', () => showView('settings'));
document.getElementById('backFromSettingsBtn').addEventListener('click', () => showView('main'));
document.getElementById('backFromLatexBtn').addEventListener('click', () => showView('result'));
backBtn.addEventListener('click', () => { lastResult = null; showView('main'); });

// ── JD extraction ─────────────────────────────────────────────────────────────
async function tryExtractJD() {
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    const response = await api.tabs.sendMessage(tab.id, { type: 'EXTRACT_JD' });

    if (response?.success && response.data?.description?.length > 100) {
      currentJD = response.data;
      jdDot.className = 'dot dot--green';
      jdLabel.textContent = 'Job description detected';
      metaTitle.textContent = currentJD.title || 'Not detected';
      metaCompany.textContent = currentJD.company || 'Not detected';
      jobMeta.style.display = 'block';
      customizeBtn.disabled = !settings.masterLatex || !settings.apiKey || !settings.backendUrl;
    } else {
      jdDot.className = 'dot dot--amber';
      jdLabel.textContent = 'No job page detected — upload a screenshot';
    }
  } catch {
    jdDot.className = 'dot dot--amber';
    jdLabel.textContent = 'Open a job posting to auto-detect';
  }
}

// ── Screenshot / OCR ──────────────────────────────────────────────────────────
screenshotInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setProgress(20, 'Running OCR on screenshot...');
  progressWrap.style.display = 'block';
  customizeBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('screenshot', file);

    const res = await fetch(`${settings.backendUrl}/api/resume/ocr`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'OCR failed');

    currentJD = {
      title: '',
      company: '',
      description: data.extractedText,
      url: 'screenshot',
    };

    jdDot.className = 'dot dot--green';
    jdLabel.textContent = 'JD extracted from screenshot';
    progressWrap.style.display = 'none';
    customizeBtn.disabled = !settings.masterLatex || !settings.apiKey;
  } catch (err) {
    setProgress(0, `OCR error: ${err.message}`);
  }
});

// ── Progress helper ───────────────────────────────────────────────────────────
function setProgress(pct, label) {
  progressFill.style.width = `${pct}%`;
  progressLabel.textContent = label;
}

// ── Main customize flow ───────────────────────────────────────────────────────
customizeBtn.addEventListener('click', async () => {
  if (!currentJD) return;

  const { apiKey, backendUrl, masterLatex, provider } = settings;

  if (!masterLatex) return alert('Paste your LaTeX resume in Settings first.');
  if (!apiKey) return alert('Add your API key in Settings first.');
  if (!backendUrl) return alert('Add your backend URL in Settings first.');

  customizeBtn.disabled = true;
  progressWrap.style.display = 'block';

  try {
    setProgress(10, 'Sending to AI...');
    await delay(300);
    setProgress(30, 'AI customizing resume...');

    const res = await fetch(`${backendUrl}/api/resume/customize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobDescription: currentJD.description,
        masterLatex,
        provider,
        apiKey,
        jobTitle: currentJD.title,
        companyName: currentJD.company,
      }),
    });

    setProgress(75, 'Compiling PDF...');
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Backend error');

    setProgress(100, 'Done!');
    await delay(400);

    lastResult = data;
    showResult(data);
  } catch (err) {
    progressWrap.style.display = 'none';
    customizeBtn.disabled = false;
    alert(`Error: ${err.message}`);
  }
});

function showResult(data) {
  progressWrap.style.display = 'none';
  customizeBtn.disabled = false;

  scoreNumber.textContent = data.atsScore ?? '—';
  scoreNumber.style.color = data.atsScore >= 80 ? '#4ade80' : data.atsScore >= 60 ? '#fbbf24' : '#f87171';

  if (data.missingKeywords?.length) {
    kwChips.innerHTML = data.missingKeywords
      .map(kw => `<span class="kw-chip">${kw}</span>`)
      .join('');
    missingKws.style.display = 'block';
  } else {
    missingKws.style.display = 'none';
  }

  showView('result');
}

// ── Download PDF ──────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', async () => {
  if (!lastResult?.pdfUrl) return;
  await api.runtime.sendMessage({
    type: 'DOWNLOAD_PDF',
    url: lastResult.pdfUrl,
    filename: lastResult.filename || 'resume.pdf',
  });
});

// ── View LaTeX ────────────────────────────────────────────────────────────────
viewLatexBtn.addEventListener('click', () => {
  latexOutput.value = lastResult?.customizedLatex || '';
  showView('latex');
});

copyLatexBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(latexOutput.value);
  copyLatexBtn.textContent = '✓ Copied';
  setTimeout(() => { copyLatexBtn.textContent = 'Copy'; }, 1500);
});

// ── Init ──────────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await loadSettings();
  showView('main');
  await tryExtractJD();
})();
