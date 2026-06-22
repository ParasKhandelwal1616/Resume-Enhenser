/**
 * Background script (MV2 for Firefox/Zen)
 * Uses browser.* API with chrome.* fallback
 */

const api = typeof browser !== 'undefined' ? browser : chrome;

api.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'DOWNLOAD_PDF') {
    const { url, filename } = message;
    api.downloads.download({ url, filename, saveAs: false })
      .then(downloadId => sendResponse({ success: true, downloadId }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

});
