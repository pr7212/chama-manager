// NOTE: Render/production-ready API URL.
// Provide API_BASE_URL in the frontend by serving js/config.js from Vercel with a global variable,
// or set window.__API_URL__ before loading this script.
// Fallback: same-origin + /api.

const CONFIG = {
  API_URL:
    typeof window !== 'undefined' && window.__API_URL__
      ? String(window.__API_URL__)
      : window.location.origin.replace(/\/$/, '') + '/api',
};
