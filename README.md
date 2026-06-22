# ResumeAI — AI-Powered Resume Customizer

A Chrome Extension + Node.js backend that automatically customizes your LaTeX resume for any job posting using AI, then compiles and downloads a ready-to-submit PDF.

---

## Architecture

```
extension/          ← Chrome Extension (MV3)
  manifest.json
  src/
    contentScript.js  ← Extracts JD from job pages
    background.js     ← Handles downloads
    popup.js          ← All UI logic
  public/
    popup.html
    popup.css

backend/            ← Node.js + Express (deploy on Render)
  src/
    index.js
    routes/
      resume.js     ← POST /api/resume/customize, /ocr, /ats-score
      health.js     ← GET /health
    services/
      aiService.js  ← Model-agnostic AI (OpenAI / Anthropic / Gemini)
      latexService.js ← pdflatex compilation
      ocrService.js   ← Tesseract OCR
  Dockerfile        ← Includes TeX Live for pdflatex
```

---

## Backend Setup (Render)

### 1. Deploy to Render

1. Push `backend/` folder to a GitHub repo
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Set **Environment**: Docker
5. Set **Dockerfile Path**: `Dockerfile`
6. Deploy — first build takes ~5 min (installing TeX Live)

### 2. Verify deployment

```
GET https://your-app.onrender.com/health
```

Should return:
```json
{ "status": "ok", "latex": true }
```

If `latex: false`, pdflatex isn't installed — check Dockerfile logs.

---

## Extension Setup

### 1. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder

### 2. Configure

Click the extension icon → ⚙ Settings:

| Field | Value |
|---|---|
| AI Provider | anthropic / openai / gemini |
| API Key | Your own key (stored locally only, never sent to our backend) |
| Backend URL | `https://your-app.onrender.com` |
| Master LaTeX | Paste your full `.tex` resume source |

---

## Usage

1. Open any job posting (LinkedIn, Internshala, Naukri, Greenhouse, Lever, Indeed...)
2. Click the ResumeAI extension icon
3. It auto-detects the job title, company, and description
4. Click **✨ Customize Resume**
5. Wait ~15-30 seconds (AI + compilation)
6. See your ATS score + missing keywords
7. Click **⬇ Download PDF**

### Screenshot mode (when copy is blocked)
1. Screenshot the job posting
2. Click **📎 Upload** in the popup
3. OCR extracts the text automatically
4. Proceed as normal

---

## API Reference

### POST `/api/resume/customize`
```json
{
  "jobDescription": "...",
  "masterLatex": "\\documentclass...",
  "provider": "anthropic",
  "apiKey": "sk-ant-...",
  "jobTitle": "Software Engineer",
  "companyName": "Google"
}
```
Returns:
```json
{
  "pdfUrl": "https://your-app.onrender.com/output/Google_Software_Engineer_Resume.pdf",
  "customizedLatex": "...",
  "atsScore": 87,
  "missingKeywords": ["Jest", "AWS"],
  "filename": "Google_Software_Engineer_Resume.pdf"
}
```

### POST `/api/resume/ocr`
Multipart form with `screenshot` image file.
Returns: `{ "extractedText": "..." }`

### POST `/api/resume/ats-score`
```json
{ "latex": "...", "jobDescription": "...", "provider": "openai", "apiKey": "..." }
```
Returns: `{ "score": 82, "missingKeywords": [...], "presentKeywords": [...], "suggestions": [...] }`

---

## Supported Job Boards

- LinkedIn Jobs
- Internshala
- Naukri
- Greenhouse
- Lever
- Indeed
- Wellfound (AngelList)
- Work at a Startup
- Any page via screenshot OCR

---

## Adding a New AI Provider

In `backend/src/services/aiService.js`, add to the `PROVIDERS` object:

```js
myprovider: {
  url: 'https://api.myprovider.com/v1/chat',
  buildHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
  buildBody: (systemPrompt, userPrompt, model) => ({ ... }),
  extractText: (data) => data.result.text,
}
```

Then select it in the extension Settings dropdown (add the option to `popup.html`).

---

## Security Notes

- API keys are stored in Chrome's local extension storage (`chrome.storage.local`) — not synced, not sent to the backend
- Each request sends the key directly from the extension to the AI provider OR to your own backend
- The backend never logs or stores API keys
- PDFs in `/output` are served publicly by filename — consider adding auth if deploying for multiple users

---

## Roadmap

- [ ] Version history with SQLite
- [ ] Cover letter generation
- [ ] Firefox / Zen browser support
- [ ] Per-application tracking dashboard
- [ ] One-click apply workflow
# Resume-Enhenser
