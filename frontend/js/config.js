const CONFIG = {
  API_URL:
    typeof window !== 'undefined' && window.__API_URL__
      ? String(window.__API_URL__)
      : `${window.location.origin}/api`,
};
