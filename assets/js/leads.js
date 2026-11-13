(function () {
  'use strict';
  const form = document.querySelector('.lead-form');
  if (!form) return;
  const config = window.GETPC_CONFIG || {};
  const fields = form.elements;
  const params = new URLSearchParams(location.search);
  const topic = params.get(form.dataset.kind === 'training' ? 'course' : 'service');
  if (topic) fields.topic.value = topic.slice(0, 160);
  const send = form.querySelector('[data-send]');
  const whatsapp = form.querySelector('[data-whatsapp]');
  const status = form.querySelector('.form-result');
  let endpoint = '';
  try {
    const url = new URL(config.leadsFeedUrl);
    if (url.protocol === 'https:' && url.hostname === 'script.google.com' && /^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) endpoint = url.href;
  } catch (_) {}
  send.disabled = !endpoint;
  form.querySelector('.form-availability').textContent = endpoint ? 'Send your inquiry here or continue on WhatsApp.' : 'Please use WhatsApp to send your inquiry while online submission is being set up.';
  const phone = String(config.contact?.whatsapp || '').replace(/\D/g, '');
  whatsapp.disabled = !/^\d{7,15}$/.test(phone);
  function data() {
    const values = Object.fromEntries(new FormData(form));
    values.kind = form.dataset.kind;
    if (fields.topic.tagName === 'SELECT') values.topic = fields.topic.selectedOptions[0].textContent;
    return values;
  }
  whatsapp.addEventListener('click', () => {
    if (!form.reportValidity()) return;
    const d = data();
    const text = `Hello GET-PC, I have a ${d.kind} inquiry.\nName: ${d.name}\nPhone: ${d.phone}\n${d.email ? 'Email: ' + d.email + '\n' : ''}Course/service: ${d.topic}\n${d.message}`;
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
    status.textContent = 'Your message is prepared. Press Send in WhatsApp to contact GET-PC.';
  });
  let requestId = '';
  let lastPayload = '';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!endpoint || !form.reportValidity() || send.disabled) return;
    const payload = data();
    const snapshot = JSON.stringify(payload);
    if (snapshot !== lastPayload) requestId = crypto.randomUUID();
    lastPayload = snapshot;
    payload.requestId = requestId;
    send.disabled = true;
    status.textContent = 'Sending your inquiry…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, {method:'POST', body:new URLSearchParams(payload), credentials:'omit', redirect:'follow', signal:controller.signal});
      const result = await response.json();
      if (!response.ok || result.ok !== true || result.requestId !== requestId) throw new Error('unconfirmed');
      status.textContent = 'Thank you. Your inquiry has been saved. Reference: ' + requestId + '. Our team will contact you; your place or booking is not confirmed yet.';
      form.reset();
      lastPayload = '';
    } catch (_) {
      status.textContent = 'We could not confirm receipt. Your details are still here. Retry with the same details, or contact us on WhatsApp and mention that you tried the online form.';
    } finally { clearTimeout(timer); send.disabled = false; }
  });
}());
