const axios = require('axios');

const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    buildHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
    extractText: (data) => data.choices[0].message.content,
  },

  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    buildHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    extractText: (data) => data.content[0].text,
  },

  gemini: {
    url: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (systemPrompt, userPrompt) => ({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
    }),
    extractText: (data) => data.candidates[0].content.parts[0].text,
  },

  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    buildHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model: model || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
    extractText: (data) => data.choices[0].message.content,
  },
};

async function callAI({ provider, apiKey, systemPrompt, userPrompt, model }) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}. Use 'openai', 'anthropic', 'gemini', or 'groq'.`);

  const url = typeof p.url === 'function' ? p.url(apiKey) : p.url;
  const headers = p.buildHeaders(apiKey);
  const body = p.buildBody(systemPrompt, userPrompt, model);

  const response = await axios.post(url, body, { headers, timeout: 60000 });
  return p.extractText(response.data);
}

async function customizeResume({ jobDescription, masterLatex, provider, apiKey, jobTitle, companyName, model }) {
  const systemPrompt = `You are an expert resume writer and ATS optimization specialist.
Your task is to MINIMALLY customize a LaTeX resume for a specific job posting.

CRITICAL RULES — violating any rule is unacceptable:
1. Return ONLY raw LaTeX source. Zero markdown, zero code fences, zero backticks, zero explanation.
2. NEVER touch any LaTeX commands, \\begin, \\end, \\textbf, \\href, \\item, or formatting.
3. PRESERVE every existing quantified result exactly: "90%+", "50+ institutes", "2 days to 2 minutes", "40%", "200+ users", "<50ms". Do NOT remove or change numbers.
4. PRESERVE the meaning and content of every bullet. Do NOT rewrite bullets from scratch.
5. You may ONLY: (a) add 1-2 relevant keywords inside an existing sentence naturally, (b) reorder the skills list.
6. FORBIDDEN phrases — never write these: "utilizing X skills", "demonstrating expertise in Y", "applying Z", "leveraging X for Y". These are banned.
7. NEVER make a bullet longer than the original.
8. NEVER add new bullets, sections, or lines.
9. Result MUST fit 1 page. If unsure, keep bullets at original length.
10. On a new line after LaTeX write exactly: ATS_SCORE:<number>
11. On the next line write exactly: MISSING_KEYWORDS:<comma-separated list>`;

  const userPrompt = `JOB TITLE: ${jobTitle || 'Not specified'}
COMPANY: ${companyName || 'Not specified'}

JOB DESCRIPTION:
${jobDescription}

MASTER LATEX RESUME:
${masterLatex}

Customize the resume. Return complete LaTeX, then ATS_SCORE:<number>, then MISSING_KEYWORDS:<list>.`;

  const rawOutput = await callAI({ provider, apiKey, systemPrompt, userPrompt, model });

  // Flexible regex — handles ATS_SCORE:85 and ATS_SCORE: 85
  const atsScoreMatch = rawOutput.match(/ATS_SCORE:\s*(\d+)/i);
  const missingMatch = rawOutput.match(/MISSING_KEYWORDS:\s*(.+)/i);

  const atsScore = atsScoreMatch ? parseInt(atsScoreMatch[1]) : null;
  const missingKeywords = missingMatch
    ? missingMatch[1].split(',').map(k => k.trim()).filter(Boolean)
    : [];

  // Strip metadata to get clean LaTeX
  const customizedLatex = rawOutput
    .replace(/ATS_SCORE:\s*\d+.*$/ms, '')
    .replace(/MISSING_KEYWORDS:\s*.+$/ms, '')
    .replace(/```latex|```/g, '')
    .trim();

  return { customizedLatex, atsScore, missingKeywords };
}

async function scoreResume({ latex, jobDescription, provider, apiKey, model }) {
  const systemPrompt = `You are an ATS scoring specialist. Return ONLY a JSON object, no other text.`;

  const userPrompt = `Score this resume against the job description.

JOB DESCRIPTION:
${jobDescription}

RESUME (LaTeX):
${latex}

Return ONLY this JSON (no markdown):
{
  "score": <0-100>,
  "missingKeywords": ["keyword1", "keyword2"],
  "presentKeywords": ["keyword1", "keyword2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  const rawOutput = await callAI({ provider, apiKey, systemPrompt, userPrompt, model });

  try {
    const clean = rawOutput.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { score: null, missingKeywords: [], presentKeywords: [], suggestions: [], raw: rawOutput };
  }
}

module.exports = { customizeResume, scoreResume, callAI };