const pendingEvents = [];
const MAX_PENDING_EVENTS = 25;
let unavailable = false;

function sendEvent(event) {
  const counter = window.goatcounter;
  if (typeof counter?.count !== 'function') return false;
  try {
    counter.count(event);
  } catch (error) {
    // Analytics is optional: a third-party failure must not interrupt the app.
    console.warn('GoatCounter could not record an event.', error);
  }
  return true;
}

export function trackEvent(path, title) {
  if (unavailable) return;
  const event = { path, title, event: true, no_session: true };
  if (!sendEvent(event) && pendingEvents.length < MAX_PENDING_EVENTS) pendingEvents.push(event);
}

export function setupAnalytics() {
  const script = document.querySelector('script[data-goatcounter]');
  if (!script) { unavailable = true; return; }

  // Keep early interactions while the async script loads, without polling or retries.
  script.addEventListener('load', () => {
    for (const event of pendingEvents.splice(0)) sendEvent(event);
  }, { once: true });
  script.addEventListener('error', () => {
    unavailable = true;
    pendingEvents.length = 0;
  }, { once: true });

  const trackClick = (event) => {
    if (event.type === 'auxclick' && event.button !== 1) return;
    const target = event.target instanceof Element ? event.target.closest('[data-analytics-event]') : null;
    if (!target || target.matches(':disabled')) return;
    if (event.type === 'auxclick' && target.tagName !== 'A') return;
    trackEvent(target.dataset.analyticsEvent, target.dataset.analyticsTitle);
  };
  // Capture also sees dynamically inserted links before a dialog can replace them.
  document.addEventListener('click', trackClick, { capture: true });
  document.addEventListener('auxclick', trackClick, { capture: true });
}
