function generateRepliesOnActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) return;

    // Normal path: content.js was already loaded by manifest.json.
    chrome.tabs.sendMessage(
      tabId,
      { type: 'VICTOR_GENERATE_REPLIES' },
      () => {
        // If this page somehow does not have the content script yet,
        // inject it once as a fallback. content.js has its own duplicate guard.
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['src/content.js']
          });
        }
      }
    );
  });
}

chrome.commands.onCommand.addListener((command) => {
  console.log('Victor Reply Assistant command:', command);

  if (command === 'generate_reply') {
    generateRepliesOnActiveTab();
    return;
  }

  if (command === 'move_to_next_button') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['src/move-to-next-button.js']
      });
    });
    return;
  }

  if (command === 'move_to_previous_button') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['src/move-to-previous-button.js']
      });
    });
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Victor Reply Assistant installed/updated:', details.reason);

  const self = await chrome.management.getSelf();

  if (details.reason === 'update' && self.installType !== 'development') {
    const changelogUrl = chrome.runtime.getURL('src/changelog.html');
    chrome.tabs.create({ url: changelogUrl });
  }
});