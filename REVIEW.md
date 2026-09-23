# Extension review

Reviewed September 23, 2026. Seven local regression tests pass. The user subsequently confirmed the extension works in their browser; automated checks use mocked browser and API behavior.

## Fixed

- Next/previous reply shortcuts now find buttons inside the current Shadow DOM cards, skip disabled buttons, and wrap without triggering paid generation.
- Reply history writes are serialized in the service worker across tabs, preventing concurrent saves from overwriting each other. Cards now receive the tweet identifier needed by status updates.
- Corrupted Unicode punctuation matching no longer removes unrelated characters such as the euro symbol.
- OpenAI requests run through a fixed service-worker endpoint with sender checks and a timeout. Chrome's host permissions apply there; content-script cross-origin requests remain subject to CORS. See [Chrome network request documentation](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).
- Requests use model-default reasoning instead of forcing `none` on every GPT-5/6 model. Reasoning models receive a 4,096-token total output budget; this includes reasoning and can increase usage compared with the old 120-token cap. Incomplete output is rejected. Effort support and output budgeting are model-dependent: [OpenAI reasoning documentation](https://developers.openai.com/api/docs/guides/reasoning).
- Failed cards provide Retry. Replies still exceeding the length limit after shortening produce an error instead of being offered for posting.
- Popup controls register before key validation finishes. Validation times out and editing the key clears the displayed validated state.
- The root welcome page's local image paths are repaired and its instructions distinguish filling the composer from posting.
- Removed the unused automatic-window-close checkbox, its settings handlers, and the disconnected legacy script.

## Remaining limitations

- The existing `Replied` marker records a click on X's native Reply button, not confirmed posting success. A failed submission can leave a card marked replied. Reliable confirmation needs validation against the live X UI.
- Generation runs automatically on the Home feed and can issue several paid requests at once. The current review preserves that behavior. Account-specific model availability, billing, rate limits, and composer paste behavior still need live verification.
- Root `welcome.html` is a legacy web page and is not opened by the current install handler. It includes external analytics and styling; it is not an offline extension onboarding page.

## Verification

Run `npm test` with Node installed. The tests use only built-in Node modules and mocked browser/API behavior. On this machine they were run with VS Code's bundled Node runtime because standalone Node is not on PATH.

After reloading the unpacked extension in `chrome://extensions`, refresh the X tab to replace its old content script. Check generation, both navigation shortcuts, Copy, and Use reply. Review the composer contents before manually posting. No posts or paid API calls were made during this review.
