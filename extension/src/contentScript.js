const api = typeof browser !== "undefined" ? browser : chrome;
/**
 * Content Script — runs on job posting pages.
 * Extracts job title, company name, and description text.
 * Sends result to background service worker on request.
 */

function extractJobData() {
  const url = window.location.href;
  let title = '', company = '', description = '';

  // ── LinkedIn ──────────────────────────────────────────────
  if (url.includes('linkedin.com')) {
    title = document.querySelector('.job-details-jobs-unified-top-card__job-title')?.innerText
      || document.querySelector('h1')?.innerText || '';
    company = document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText
      || document.querySelector('.topcard__org-name-link')?.innerText || '';
    description = document.querySelector('.jobs-description__content')?.innerText
      || document.querySelector('#job-details')?.innerText || '';
  }

  // ── Internshala ───────────────────────────────────────────
  else if (url.includes('internshala.com')) {
    title = document.querySelector('.profile-overview h1')?.innerText
      || document.querySelector('.heading_4_5')?.innerText || '';
    company = document.querySelector('.company-name')?.innerText
      || document.querySelector('.heading_6')?.innerText || '';
    description = document.querySelector('#about_internship_details')?.innerText
      || document.querySelector('.internship_details')?.innerText || '';
  }

  // ── Naukri ────────────────────────────────────────────────
  else if (url.includes('naukri.com')) {
    title = document.querySelector('.jd-header-title')?.innerText
      || document.querySelector('h1')?.innerText || '';
    company = document.querySelector('.jd-header-comp-name')?.innerText || '';
    description = document.querySelector('.job-desc')?.innerText
      || document.querySelector('#job_description')?.innerText || '';
  }

  // ── Greenhouse ────────────────────────────────────────────
  else if (url.includes('greenhouse.io')) {
    title = document.querySelector('h1.app-title')?.innerText
      || document.querySelector('h1')?.innerText || '';
    company = document.querySelector('.company-name')?.innerText || '';
    description = document.querySelector('#content')?.innerText
      || document.querySelector('.job-description')?.innerText || '';
  }

  // ── Lever ─────────────────────────────────────────────────
  else if (url.includes('lever.co')) {
    title = document.querySelector('.posting-headline h2')?.innerText
      || document.querySelector('h2')?.innerText || '';
    company = document.querySelector('.main-header-logo img')?.alt || '';
    description = document.querySelector('.posting-requirements')?.innerText
      || document.querySelector('[data-qa="job-description"]')?.innerText || '';
  }

  // ── Generic fallback (Indeed, Wellfound, others) ──────────
  else {
    title = document.querySelector('h1')?.innerText || document.title || '';
    company = document.querySelector('[class*="company"]')?.innerText
      || document.querySelector('[data-company]')?.innerText || '';
    // Take the largest text block on the page as the description
    const candidates = Array.from(document.querySelectorAll('div, section, article'))
      .filter(el => el.children.length > 2)
      .sort((a, b) => b.innerText.length - a.innerText.length);
    description = candidates[0]?.innerText || document.body.innerText || '';
  }

  return {
    title: title.trim(),
    company: company.trim(),
    description: description.trim().slice(0, 8000), // cap at 8k chars
    url,
  };
}

// Listen for message from popup asking for JD data
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JD') {
    const data = extractJobData();
    sendResponse({ success: true, data });
  }
  return true; // keep channel open for async
});
