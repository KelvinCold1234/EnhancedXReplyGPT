chrome.commands.onCommand.addListener((command) => {
  console.log('Victor Reply Assistant command:', command);

  if (command === 'generate_reply') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['src/content.js']
      });
    });
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
