function isSupportedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['x.com', 'twitter.com', 'mobile.twitter.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

// Serialize history updates across all tabs to avoid lost read/modify/write saves.
let historyQueue = Promise.resolve();
function saveReplyHistory(tweetKey, patch) {
  const save = historyQueue.then(async () => {
    if (!/^\d+$/.test(tweetKey) || !patch || typeof patch !== 'object') {
      throw new Error('Invalid reply history update.');
    }
    const key = 'victor-reply-history-v1';
    const stored = await chrome.storage.local.get(key);
    const history = stored[key] || {};
    history[tweetKey] = { ...history[tweetKey], ...patch, updatedAt: Date.now() };
    Object.keys(history)
      .sort((a, b) => history[b].updatedAt - history[a].updatedAt)
      .slice(500).forEach((id) => delete history[id]);
    await chrome.storage.local.set({ [key]: history });
    return history[tweetKey];
  });
  historyQueue = save.catch(() => {});
  return save;
}

async function requestReply({ model, instructions, input, maxOutputTokens }) {
  if (typeof model !== 'string' || typeof instructions !== 'string' || typeof input !== 'string') {
    throw new Error('Invalid reply request.');
  }
  const settings = await chrome.storage.local.get('open-ai-key');
  const apiKey = (settings['open-ai-key'] || '').trim();
  if (!apiKey) throw new Error('Add your OpenAI API key in the extension settings.');
  // Reasoning support varies by model. Use its default and reserve room for
  // reasoning tokens, which share the output budget with the visible reply.
  const reasoningModel = /^(gpt-[5-9]|o[1-9])/i.test(model);
  const budget = Number.isFinite(maxOutputTokens) ? maxOutputTokens : 120;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, instructions, input, store: false,
      max_output_tokens: reasoningModel ? 4096 : Math.max(64, Math.min(512, budget))
    }),
    signal: AbortSignal.timeout(25000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed (HTTP ${response.status}).`);
  if (data.status === 'incomplete') {
    throw new Error('OpenAI could not finish this reply within the output limit. Try a different model.');
  }
  return data;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['VICTOR_OPENAI_REPLY', 'VICTOR_SAVE_HISTORY'].includes(message?.type)) return;
  if (sender.id !== chrome.runtime.id || !isSupportedUrl(sender.url)) {
    sendResponse({ error: 'Unsupported reply source.' });
    return;
  }
  const task = message.type === 'VICTOR_SAVE_HISTORY'
    ? saveReplyHistory(message.tweetKey, message.patch)
    : requestReply(message);
  task.then((data) => sendResponse({ data }), (error) => sendResponse({ error: error.message }));
  return true;
});

function generateRepliesOnActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId || !isSupportedUrl(tabs[0].url)) return;

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
          }).catch((error) => console.warn('Could not load reply assistant:', error.message));
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
      if (!tabs[0]?.id || !isSupportedUrl(tabs[0].url)) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['src/move-to-next-button.js']
      }).catch((error) => console.warn('Could not navigate replies:', error.message));
    });
    return;
  }

  if (command === 'move_to_previous_button') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id || !isSupportedUrl(tabs[0].url)) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['src/move-to-previous-button.js']
      }).catch((error) => console.warn('Could not navigate replies:', error.message));
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
