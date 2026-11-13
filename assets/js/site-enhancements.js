(function () {
  'use strict';
  const configured = window.GETPC_CONFIG?.analyticsScriptUrl;
  if (!configured) return;
  try {
    const url = new URL(configured);
    if (url.origin !== 'https://plausible.io' || !/^\/js\/[a-zA-Z0-9_.-]+\.js$/.test(url.pathname) || url.search || url.hash) return;
    window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
    window.plausible.init = window.plausible.init || function (options) { window.plausible.o = options || {}; };
    window.plausible.init();
    const script = document.createElement('script');script.async = true;script.src = url.href;
    document.head.append(script);
  } catch (_) { /* Analytics is optional; it must never block the website. */ }
}());
