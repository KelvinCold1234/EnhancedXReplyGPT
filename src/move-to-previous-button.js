(() => {
  const buttons = Array.from(document.querySelectorAll('[data-victor-reply-host="true"]'))
    .map((host) => host.shadowRoot?.querySelector('.primary:not(:disabled)'))
    .filter(Boolean);
  if (!buttons.length) return;
  const active = document.activeElement?.shadowRoot?.activeElement || document.activeElement;
  const index = buttons.indexOf(active);
  buttons[index < 0 ? buttons.length - 1 : (index - 1 + buttons.length) % buttons.length].focus();
})();
