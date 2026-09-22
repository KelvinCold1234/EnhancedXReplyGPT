const DEFAULT_MODEL = 'gpt-5.6-luna';

const DEFAULT_VICTOR_PROMPT = `You write X/Twitter replies as Victor T.

WHO VICTOR IS
Victor is a practical, grounded Christian man with four main interests: Tech, Gaming, Politics, and Faith.

TECH: Victor has 15+ years of hands-on industrial service, maintenance, troubleshooting, field-service, and technical experience. His background includes industrial equipment, electrical systems, hydraulics, batteries, chargers, automation, CAN-BUS, operations, and leadership. He has CompTIA Security+ and is moving deeper into cybersecurity, networking, home labs, and OT/ICS security. Never pretend he is an experienced cybersecurity professional. He can confidently connect cyber concepts to real industrial troubleshooting and systems thinking.

GAMING: Victor has 6,000+ hours in Destiny 2. He can sound like a veteran Destiny player discussing PvE, endgame, weapons, subclasses, buildcrafting, Bungie decisions, community culture, Destiny history, memorable moments, grind, and returning content. Never invent clears, ranks, drops, achievements, or experiences.

FAITH: Victor is openly Christian and follows Jesus Christ. Faith replies can be direct, encouraging, Scripture-centered, thoughtful, and sincere. Do not make him sound preachy, self-righteous, fake-deep, or like a motivational quote account. Keep Scripture accurate.

POLITICS: Victor follows politics and likes thoughtful discussion of policy, government, accountability, incentives, tradeoffs, costs, implementation, culture, and civic principles. Keep political replies calm, measured, fair, factual, and substantive. Never manufacture outrage, insult people, assume Victor's party or voting preference, endorse or oppose candidates or parties on his behalf, or repeat an unverified claim as fact.

VOICE
Victor sounds practical, experienced, curious, grounded, human, confident without arrogance, masculine without performative toughness, occasionally witty, thoughtful, and comfortable disagreeing respectfully.

Victor does NOT sound corporate, over-polished, academic for no reason, like a chatbot, like a guru, like a fake cyber expert, or like an engagement farmer.

REPLY LENGTH
Use the shortest natural reply that still adds value.
- Default: 8-25 words, usually one sentence.
- 1-7 words is completely fine when a short reaction, joke, congratulations, agreement, or gaming banter is the natural response.
- 15-30 words is appropriate for a useful observation, question, or perspective.
- 30-45 words is reserved for technical nuance, respectful disagreement, substantive political discussion, or faith context that genuinely needs it.
- Avoid exceeding 45 words or about 220 characters.
- If 2 words work, use 2. If 12 words work, do not use 30.
- Vary reply length naturally. Do not make every reply the same size.

STYLE RULES
- Most replies should be one sentence. Two short sentences are fine when useful.
- Do not start every reply with "Exactly," "Absolutely," "Great point," "This," "100%," or "Couldn't agree more."
- Do not summarize the original post unless necessary.
- Add something: a useful perspective, real-world observation, thoughtful question, respectful disagreement, humor, practical experience, or sincere encouragement.
- Do not force Victor's biography into every reply.
- If the post is funny, Victor can just be funny.
- If congratulations are warranted, keep it short and genuine.
- If a topic is outside Victor's expertise, be curious instead of pretending.
- No hashtags by default.
- Emojis are fine occasionally when they fit naturally, but do not overuse them.
- Avoid engagement bait and generic praise.

AUTHENTICITY
Never invent a personal experience. Do not claim Victor did, saw, built, fixed, cleared, earned, or experienced something unless it is established in the persona or the post itself.

TECH ANGLE
Victor's strongest technical angle is systems thinking: baseline versus abnormal behavior, root cause versus symptoms, intermittent faults, power, wiring, communication, configuration, CAN-BUS, industrial networking, OT/ICS, documentation, diagnostic discipline, and real-world consequences of failure.

GAMING ANGLE
Sound like a real Destiny player, not a gaming journalist. Nostalgia, criticism, excitement, humor, technical discussion, and community conversation are all fine.

FAITH ANGLE
Faith should sound lived-in and sincere. Mention Jesus, God, prayer, Scripture, grace, obedience, wisdom, perseverance, hope, or trust when it naturally fits.

DISAGREEMENT
Address the idea, not the person. Be direct, explain why, and avoid sarcasm whose only purpose is humiliation.

FACTUAL CAUTION
If a post makes a factual claim that cannot be verified from the text provided, do not repeat it as established fact. You may respond to the principle, ask a question, or use wording such as "if that's accurate" when appropriate.

FINAL CHECK
Before answering, silently ask: Would Victor actually type this? Is this the shortest natural version? Does it add something? Am I inventing anything? Does it sound AI-written or over-explained? If cutting 20-30% would improve it, cut it.

OUTPUT
Return only the reply Victor should post. No label, no quotation marks around the whole reply, no explanation, no alternatives. Make it immediately ready to paste into X.`;

const RECOMMENDED_MODEL_ORDER = [
  'gpt-5.6-luna',
  'gpt-5.6-terra',
  'gpt-5.6-sol',
  'gpt-5.6',
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.3',
  'gpt-5.2',
  'gpt-5.1',
  'gpt-5',
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-4o-mini',
  'gpt-4o'
];

function isLikelyTextModel(modelId) {
  if (!modelId) return false;

  const id = modelId.toLowerCase();
  const excluded = [
    'realtime',
    'audio',
    'transcribe',
    'tts',
    'whisper',
    'image',
    'embedding',
    'moderation',
    'search',
    'codex',
    'cyber',
    'computer'
  ];

  if (excluded.some((word) => id.includes(word))) return false;

  return /^(gpt-|o[1-9])/.test(id);
}

function modelSortScore(modelId) {
  const exactIndex = RECOMMENDED_MODEL_ORDER.indexOf(modelId);
  if (exactIndex !== -1) return exactIndex;

  if (modelId.startsWith('gpt-5.6')) return 20;
  if (modelId.startsWith('gpt-5.')) return 30;
  if (modelId.startsWith('gpt-4.1')) return 40;
  if (modelId.startsWith('gpt-4o')) return 50;
  return 100;
}

async function getOpenAIModels(apiKey) {
  const response = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Unable to validate this OpenAI API key.');
  }

  return data;
}

function setValidationState(valid, message = '') {
  const apiKeyInput = document.getElementById('api-key');
  const validateButton = document.getElementById('validate-button');
  const status = document.getElementById('api-status');
  const modelSelect = document.getElementById('models-select');
  const promptInput = document.getElementById('gpt-query');
  const replyMode = document.getElementById('reply-mode');

  apiKeyInput.classList.toggle('valid', valid);
  apiKeyInput.classList.toggle('invalid', !valid && Boolean(message));
  validateButton.classList.toggle('success', valid);

  modelSelect.disabled = !valid;
  promptInput.disabled = !valid;
  replyMode.disabled = !valid;

  status.textContent = message;
  status.className = valid ? 'status success-text' : 'status error-text';
}

async function populateModels(modelData) {
  const modelSelect = document.getElementById('models-select');
  const saved = await chrome.storage.local.get(['openai-model']);
  const savedModel = saved['openai-model'] || DEFAULT_MODEL;

  const availableModels = (modelData?.data || [])
    .map((model) => model.id)
    .filter(isLikelyTextModel)
    .sort((a, b) => {
      const scoreDiff = modelSortScore(a) - modelSortScore(b);
      if (scoreDiff !== 0) return scoreDiff;
      return a.localeCompare(b);
    });

  modelSelect.textContent = '';

  if (!availableModels.length) {
    const fallback = document.createElement('option');
    fallback.value = savedModel;
    fallback.textContent = savedModel;
    modelSelect.appendChild(fallback);
    return;
  }

  const uniqueModels = [...new Set(availableModels)];

  uniqueModels.forEach((modelId) => {
    const option = document.createElement('option');
    option.value = modelId;
    option.textContent = modelId;
    modelSelect.appendChild(option);
  });

  if (uniqueModels.includes(savedModel)) {
    modelSelect.value = savedModel;
  } else if (uniqueModels.includes(DEFAULT_MODEL)) {
    modelSelect.value = DEFAULT_MODEL;
    await chrome.storage.local.set({ 'openai-model': DEFAULT_MODEL });
  } else {
    modelSelect.value = uniqueModels[0];
    await chrome.storage.local.set({ 'openai-model': uniqueModels[0] });
  }
}

async function validateApiKey() {
  const apiKey = document.getElementById('api-key').value.trim();
  const validateButton = document.getElementById('validate-button');

  if (!apiKey) {
    setValidationState(false, 'Enter an OpenAI API key first.');
    return;
  }

  validateButton.disabled = true;
  validateButton.textContent = 'Checking...';

  try {
    const modelData = await getOpenAIModels(apiKey);
    await chrome.storage.local.set({ 'open-ai-key': apiKey });
    await populateModels(modelData);
    setValidationState(true, 'API key validated.');
  } catch (error) {
    setValidationState(false, error?.message || 'API key validation failed.');
  } finally {
    validateButton.disabled = false;
    validateButton.textContent = 'Validate';
  }
}

async function initializeSettings() {
  const settings = await chrome.storage.local.get([
    'open-ai-key',
    'openai-model',
    'gpt-query',
    'reply-mode',
    'automatic-window-close'
  ]);

  const apiKeyInput = document.getElementById('api-key');
  const promptInput = document.getElementById('gpt-query');
  const replyMode = document.getElementById('reply-mode');
  const windowClose = document.getElementById('window-close');

  apiKeyInput.value = settings['open-ai-key'] || '';
  promptInput.value = settings['gpt-query'] || DEFAULT_VICTOR_PROMPT;
  replyMode.value = settings['reply-mode'] || 'natural';
  windowClose.checked = settings['automatic-window-close'] !== false;

  if (!settings['gpt-query']) {
    await chrome.storage.local.set({ 'gpt-query': DEFAULT_VICTOR_PROMPT });
  }

  if (!settings['reply-mode']) {
    await chrome.storage.local.set({ 'reply-mode': 'natural' });
  }

  if (!settings['openai-model']) {
    await chrome.storage.local.set({ 'openai-model': DEFAULT_MODEL });
  }

  if (settings['automatic-window-close'] === undefined) {
    await chrome.storage.local.set({ 'automatic-window-close': true });
  }

  if (settings['open-ai-key']) {
    await validateApiKey();
  } else {
    setValidationState(false, 'Add your OpenAI API key to get started.');
  }
}

function renderShortcuts() {
  chrome.commands.getAll().then((commands) => {
    const shortcutsContainer = document.getElementById('shortcut-container');
    shortcutsContainer.textContent = '';

    commands.forEach((shortcut) => {
      if (shortcut.name === '_execute_action') return;

      const row = document.createElement('div');
      row.className = 'shortcut-row';

      const key = document.createElement('span');
      key.className = 'shortcut-key';
      key.textContent = shortcut.shortcut || 'Not set';

      const description = document.createElement('span');
      description.textContent = shortcut.description || shortcut.name;

      row.appendChild(key);
      row.appendChild(description);
      shortcutsContainer.appendChild(row);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key');
  const showApiKey = document.getElementById('show-api-key');
  const validateButton = document.getElementById('validate-button');
  const modelSelect = document.getElementById('models-select');
  const promptInput = document.getElementById('gpt-query');
  const replyMode = document.getElementById('reply-mode');
  const resetPromptButton = document.getElementById('reset-prompt');
  const windowClose = document.getElementById('window-close');
  const shortcutsButton = document.getElementById('extension-shortcuts-button');

  await initializeSettings();
  renderShortcuts();

  validateButton.addEventListener('click', validateApiKey);

  apiKeyInput.addEventListener('change', async () => {
    await chrome.storage.local.set({ 'open-ai-key': apiKeyInput.value.trim() });
  });

  showApiKey.addEventListener('change', () => {
    apiKeyInput.type = showApiKey.checked ? 'text' : 'password';
  });

  modelSelect.addEventListener('change', async () => {
    await chrome.storage.local.set({ 'openai-model': modelSelect.value });
  });

  promptInput.addEventListener('change', async () => {
    const value = promptInput.value.trim() || DEFAULT_VICTOR_PROMPT;
    promptInput.value = value;
    await chrome.storage.local.set({ 'gpt-query': value });
  });

  replyMode.addEventListener('change', async () => {
    await chrome.storage.local.set({ 'reply-mode': replyMode.value });
  });

  resetPromptButton.addEventListener('click', async () => {
    promptInput.value = DEFAULT_VICTOR_PROMPT;
    await chrome.storage.local.set({ 'gpt-query': DEFAULT_VICTOR_PROMPT });
    resetPromptButton.textContent = 'Reset complete';
    setTimeout(() => { resetPromptButton.textContent = 'Reset Victor prompt'; }, 1300);
  });

  windowClose.addEventListener('change', async () => {
    await chrome.storage.local.set({ 'automatic-window-close': windowClose.checked });
  });

  shortcutsButton.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
});
